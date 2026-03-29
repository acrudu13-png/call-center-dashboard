from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from app.database import get_db
from app.models.job import TranscriptionJob, LogEntry
from app.schemas.job import JobResponse, JobListResponse, LogEntryResponse, LogListResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/logs", tags=["logs"], dependencies=[Depends(get_current_user)])


@router.get("/jobs", response_model=JobListResponse)
def list_jobs(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(TranscriptionJob)
    if status:
        query = query.filter(TranscriptionJob.status == status)

    total = query.count()
    jobs = (
        query.order_by(desc(TranscriptionJob.created_at))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    return JobListResponse(
        jobs=[
            JobResponse(
                jobId=j.job_id, fileName=j.file_name, source=j.source,
                status=j.status, progress=j.progress, callId=j.call_id,
                errorMessage=j.error_message, metadata=j.job_metadata or {},
                startedAt=j.started_at, completedAt=j.completed_at,
                createdAt=j.created_at,
            )
            for j in jobs
        ],
        total=total,
    )


@router.get("/entries", response_model=LogListResponse)
def list_log_entries(
    page: int = Query(1, ge=1),
    pageSize: int = Query(50, ge=1, le=200),
    level: Optional[str] = None,
    source: Optional[str] = None,
    jobId: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(LogEntry)
    if level:
        query = query.filter(LogEntry.level == level)
    if source:
        query = query.filter(LogEntry.source == source)
    if jobId:
        query = query.filter(LogEntry.job_id == jobId)

    total = query.count()
    logs = (
        query.order_by(desc(LogEntry.timestamp))
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    return LogListResponse(
        logs=[
            LogEntryResponse(
                id=l.id, timestamp=l.timestamp, level=l.level,
                source=l.source, message=l.message, jobId=l.job_id,
            )
            for l in logs
        ],
        total=total,
    )
