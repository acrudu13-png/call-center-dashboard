"""
Per-organization scheduled ingestion.

Each active organization gets its own APScheduler cron job, firing at the hour
configured in its "ingest-schedule" setting. Jobs are created/updated/removed
dynamically as organizations or their settings change.
"""
import asyncio
import json
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal, APP_TZ
from app.models.setting import Setting
from app.models.organization import Organization

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()

# ── Per-org ingestion runner ────────────────────────────────


def _run_org_ingestion(org_id: str, org_slug: str):
    """Called by APScheduler — runs ingestion for a single organization."""
    from app.services.ingestion_service import IngestionService

    db = SessionLocal()
    try:
        # Re-check enabled flag at run time (in case it changed since the job was created)
        row = db.query(Setting).filter(
            Setting.organization_id == org_id,
            Setting.key == "ingest-schedule",
        ).first()
        if row:
            cfg = json.loads(row.value)
            if not cfg.get("enabled", True):
                logger.info(f"Scheduled ingestion disabled for org {org_slug}, skipping.")
                return

        logger.info(f"Running scheduled ingestion for org {org_slug}")
        svc = IngestionService(db, org_id=org_id)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(svc.run_ingestion(source="sftp"))
        finally:
            loop.close()
    except Exception as e:
        logger.error(f"Scheduled ingestion failed for org {org_slug}: {e}")
    finally:
        db.close()


# ── Job management ──────────────────────────────────────────

def _job_id(org_id: str) -> str:
    return f"ingestion_{org_id}"


def _get_org_schedule(db, org_id: str) -> dict:
    """Read the ingest-schedule setting for an org. Returns defaults if not set."""
    row = db.query(Setting).filter(
        Setting.organization_id == org_id,
        Setting.key == "ingest-schedule",
    ).first()
    if row:
        try:
            return json.loads(row.value)
        except (json.JSONDecodeError, TypeError):
            pass
    return {"cronHour": 6, "enabled": True}


def sync_org_jobs():
    """Create, update, or remove a cron job for each active organization.
    Call this on startup and whenever orgs or schedules change."""
    db = SessionLocal()
    try:
        orgs = db.query(Organization).filter(Organization.is_active == True).all()

        # Track which job IDs we want active
        wanted_ids: set[str] = set()

        for org in orgs:
            cfg = _get_org_schedule(db, org.id)
            jid = _job_id(org.id)
            wanted_ids.add(jid)

            hour = cfg.get("cronHour", 6)
            enabled = cfg.get("enabled", True)

            existing = scheduler.get_job(jid)

            if not enabled:
                # Remove job if it exists
                if existing:
                    scheduler.remove_job(jid)
                    logger.info(f"Removed disabled ingestion job for org {org.slug}")
                continue

            if existing:
                # Update the trigger if the hour changed
                scheduler.reschedule_job(
                    jid,
                    trigger="cron",
                    hour=hour,
                    minute=0,
                    timezone=APP_TZ,
                )
                logger.debug(f"Updated ingestion job for org {org.slug} → {hour:02d}:00")
            else:
                # Create new job
                scheduler.add_job(
                    _run_org_ingestion,
                    "cron",
                    hour=hour,
                    minute=0,
                    timezone=APP_TZ,
                    id=jid,
                    args=[org.id, org.slug],
                    replace_existing=True,
                )
                logger.info(f"Created ingestion job for org {org.slug} at {hour:02d}:00")

        # Remove jobs for deactivated/deleted orgs
        for job in scheduler.get_jobs():
            if job.id.startswith("ingestion_") and job.id not in wanted_ids:
                scheduler.remove_job(job.id)
                logger.info(f"Removed orphaned ingestion job {job.id}")

    finally:
        db.close()


def update_org_schedule(org_id: str):
    """Update (or remove) the cron job for a single organization.
    Called from the settings router when ingest-schedule is saved."""
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.id == org_id).first()
        if not org or not org.is_active:
            # Remove job if org deactivated/deleted
            existing = scheduler.get_job(_job_id(org_id))
            if existing:
                scheduler.remove_job(_job_id(org_id))
                logger.info(f"Removed ingestion job for deactivated org {org_id}")
            return

        cfg = _get_org_schedule(db, org_id)
        jid = _job_id(org_id)
        hour = cfg.get("cronHour", 6)
        enabled = cfg.get("enabled", True)

        existing = scheduler.get_job(jid)

        if not enabled:
            if existing:
                scheduler.remove_job(jid)
                logger.info(f"Removed disabled ingestion job for org {org.slug}")
            return

        if existing:
            scheduler.reschedule_job(
                jid,
                trigger="cron",
                hour=hour,
                minute=0,
                timezone=APP_TZ,
            )
            logger.info(f"Rescheduled ingestion for org {org.slug} → {hour:02d}:00")
        else:
            scheduler.add_job(
                _run_org_ingestion,
                "cron",
                hour=hour,
                minute=0,
                timezone=APP_TZ,
                id=jid,
                args=[org.id, org.slug],
                replace_existing=True,
            )
            logger.info(f"Created ingestion job for org {org.slug} at {hour:02d}:00")
    finally:
        db.close()


# ── Startup ─────────────────────────────────────────────────

def start_scheduler():
    """Start the background scheduler and create per-org jobs."""
    scheduler.start()
    sync_org_jobs()

    job_count = len([j for j in scheduler.get_jobs() if j.id.startswith("ingestion_")])
    logger.info(f"Scheduler started with {job_count} org ingestion job(s)")
