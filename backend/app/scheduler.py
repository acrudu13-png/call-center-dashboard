import asyncio
import json
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.models.setting import Setting
from app.models.organization import Organization

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _run_scheduled_ingestion():
    """Called by APScheduler on cron schedule. Iterates over all active orgs."""
    from app.services.ingestion_service import IngestionService

    db = SessionLocal()
    try:
        orgs = db.query(Organization).filter(Organization.is_active == True).all()
    finally:
        db.close()

    for org in orgs:
        db = SessionLocal()
        try:
            # Check if ingestion is enabled for this org
            row = db.query(Setting).filter(
                Setting.organization_id == org.id,
                Setting.key == "ingest_schedule",
            ).first()
            if row:
                cfg = json.loads(row.value)
                if not cfg.get("enabled", True):
                    logger.info(f"Scheduled ingestion is disabled for org {org.slug}, skipping.")
                    continue

            logger.info(f"Running scheduled ingestion for org {org.slug}")
            svc = IngestionService(db, org_id=org.id)
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(svc.run_ingestion(source="sftp"))
            loop.close()
        except Exception as e:
            logger.error(f"Scheduled ingestion failed for org {org.slug}: {e}")
        finally:
            db.close()


def start_scheduler():
    """Start the background scheduler for daily ingestion.
    Uses the earliest hour configured across all orgs (or default 6)."""
    db = SessionLocal()
    try:
        # Use the lowest hour across all org schedules, default 6
        rows = db.query(Setting).filter(Setting.key == "ingest_schedule").all()
        hours = []
        for row in rows:
            try:
                cfg = json.loads(row.value)
                hours.append(cfg.get("cronHour", 6))
            except Exception:
                pass
        hour = min(hours) if hours else 6
    finally:
        db.close()

    from app.database import APP_TZ

    scheduler.add_job(
        _run_scheduled_ingestion,
        "cron",
        hour=hour,
        minute=0,
        timezone=APP_TZ,
        id="daily_ingestion",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Scheduled daily ingestion at {hour:02d}:00 (Europe/Bucharest)")
