from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from app.database import get_db, SessionLocal
from app.database import utcnow
from app.services.ingestion_service import IngestionService
from app.auth import get_current_user

router = APIRouter(prefix="/api/ingestion", tags=["ingestion"], dependencies=[Depends(get_current_user)])


async def _run_ingestion_bg(source: str, remote_path: Optional[str] = None, resume_run_id: Optional[str] = None):
    """Background task to run ingestion with its own DB session."""
    db = SessionLocal()
    try:
        svc = IngestionService(db)
        await svc.run_ingestion(source=source, remote_path=remote_path, resume_run_id=resume_run_id)
    finally:
        db.close()


@router.post("/trigger")
async def trigger_ingestion(
    source: str = "sftp",
    remote_path: Optional[str] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Manually trigger an ingestion run. Runs in background."""
    background_tasks.add_task(_run_ingestion_bg, source, remote_path)
    return {"message": f"Ingestion triggered from {source}. Check /api/logs for progress."}


@router.post("/stop")
def stop_ingestion(run_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Stop a running ingestion.

    If the process is alive (has an in-memory flag): sets the flag.
    The background task checks this flag between files and stops cleanly.

    If the process is dead (orphaned run): updates DB directly.
    """
    from app.services.ingestion_service import request_stop, get_active_run_id
    from app.models.job import IngestionRun

    target = run_id or get_active_run_id()

    # If no in-memory flag, check DB for orphaned runs
    if not target:
        orphan = (
            db.query(IngestionRun)
            .filter(IngestionRun.status.in_(["downloading", "processing"]))
            .order_by(IngestionRun.started_at.desc())
            .first()
        )
        if orphan:
            target = orphan.run_id

    if not target:
        return {"stopped": False, "message": "No active ingestion to stop."}

    # Try to signal the in-memory process
    flag_set = request_stop(target)

    if flag_set:
        # Process is alive — it will handle the DB update itself.
        # Just return immediately. The background task will set status="stopped".
        return {"stopped": True, "runId": target,
                "message": f"Stop signal sent to {target}. Will stop after current file."}

    # Process is dead (orphaned) — update DB directly
    run = db.query(IngestionRun).filter(IngestionRun.run_id == target).first()
    if run and run.status in ("downloading", "processing"):
        run.status = "stopped"
        run.current_file = None
        run.completed_at = utcnow()
        db.commit()
        _broadcast_run_from_db(run)
        return {"stopped": True, "runId": target, "message": f"Stopped orphaned run {target}."}

    return {"stopped": False, "message": f"Run {target} not found or already stopped."}


def _broadcast_run_from_db(run):
    """Helper to broadcast run state from the router (for orphaned runs only)."""
    from app.ws_manager import manager
    manager.broadcast_sync("ingestion_progress", {
        "runId": run.run_id, "source": run.source, "status": run.status,
        "remotePath": run.remote_path, "totalFiles": run.total_files,
        "downloadedFiles": run.downloaded_files, "processedFiles": run.processed_files,
        "failedFiles": run.failed_files, "currentFile": None,
        "errorMessage": run.error_message,
        "startedAt": run.started_at.isoformat() if run.started_at else None,
        "completedAt": run.completed_at.isoformat() if run.completed_at else None,
    })


@router.post("/rerun/{run_id}")
async def rerun_ingestion(
    run_id: str,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
):
    """Resume a stopped/failed ingestion — continues the same run, skipping completed files."""
    from app.models.job import IngestionRun

    run = db.query(IngestionRun).filter(IngestionRun.run_id == run_id).first()
    if not run:
        return {"rerun": False, "message": f"Run {run_id} not found."}
    if run.status in ("downloading", "processing", "stopping"):
        return {"rerun": False, "message": f"Run {run_id} is still active."}

    background_tasks.add_task(_run_ingestion_bg, run.source, run.remote_path, run.run_id)
    return {
        "rerun": True,
        "runId": run_id,
        "message": f"Resuming {run_id}...",
    }


@router.get("/runs-list")
def runs_list(db: Session = Depends(get_db)):
    """Return a compact list of all runs for use in filter dropdowns."""
    from app.models.job import IngestionRun
    import os

    runs = (
        db.query(IngestionRun)
        .order_by(desc(IngestionRun.started_at))
        .limit(50)
        .all()
    )
    result = []
    for r in runs:
        # Extract date from remote_path: "/tlr-cs-recordings/2026-03-15" → "2026-03-15"
        date_label = os.path.basename(r.remote_path) if r.remote_path else None
        result.append({
            "runId": r.run_id,
            "dateLabel": date_label,
            "status": r.status,
            "totalFiles": r.total_files,
            "processedFiles": r.processed_files,
            "startedAt": r.started_at.isoformat() if r.started_at else None,
        })
    return {"runs": result}


@router.delete("/run/{run_id}")
def delete_run(run_id: str, db: Session = Depends(get_db)):
    """Delete a stopped/failed/completed run and its associated jobs and log entries."""
    from app.models.job import IngestionRun, TranscriptionJob, LogEntry

    run = db.query(IngestionRun).filter(IngestionRun.run_id == run_id).first()
    if not run:
        return {"deleted": False, "message": f"Run {run_id} not found."}
    if run.status in ("downloading", "processing", "stopping"):
        return {"deleted": False, "message": f"Run {run_id} is still active. Stop it first."}

    # Delete associated calls (and their transcripts + scorecards via cascade)
    from app.models.call import Call
    calls_deleted = db.query(Call).filter(Call.ingestion_run_id == run_id).delete(synchronize_session=False)

    # Delete associated jobs and logs
    job_ids = [j.job_id for j in db.query(TranscriptionJob.job_id).filter(
        TranscriptionJob.started_at >= run.started_at,
        TranscriptionJob.started_at <= (run.completed_at or utcnow()),
    ).all()]
    if job_ids:
        db.query(LogEntry).filter(LogEntry.job_id.in_(job_ids)).delete(synchronize_session=False)
        db.query(TranscriptionJob).filter(TranscriptionJob.job_id.in_(job_ids)).delete(synchronize_session=False)

    db.delete(run)
    db.commit()
    return {"deleted": True, "runId": run_id, "message": f"Deleted run {run_id}, {calls_deleted} calls, and {len(job_ids)} jobs."}


@router.get("/status")
def ingestion_status(db: Session = Depends(get_db)):
    """Check if there are any active ingestion jobs."""
    from app.models.job import TranscriptionJob
    active = (
        db.query(TranscriptionJob)
        .filter(TranscriptionJob.status.in_(["queued", "transcribing", "analyzing"]))
        .count()
    )
    return {"activeJobs": active, "isRunning": active > 0}


@router.get("/progress")
def ingestion_progress(
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get the latest ingestion run(s) with full progress info."""
    from app.models.job import IngestionRun

    runs = (
        db.query(IngestionRun)
        .order_by(desc(IngestionRun.started_at))
        .limit(limit)
        .all()
    )

    return {
        "runs": [
            {
                "runId": r.run_id,
                "source": r.source,
                "status": r.status,
                "remotePath": r.remote_path,
                "totalFiles": r.total_files,
                "downloadedFiles": r.downloaded_files,
                "processedFiles": r.processed_files,
                "failedFiles": r.failed_files,
                "currentFile": r.current_file,
                "errorMessage": r.error_message,
                "startedAt": r.started_at.isoformat() if r.started_at else None,
                "completedAt": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in runs
        ]
    }
