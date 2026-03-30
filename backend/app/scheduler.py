import asyncio
import json
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
from app.models.setting import Setting

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _run_scheduled_ingestion():
    """Called by APScheduler on cron schedule."""
    from app.services.ingestion_service import IngestionService

    db = SessionLocal()
    try:
        # Check if ingestion is enabled
        row = db.query(Setting).filter(Setting.key == "ingest_schedule").first()
        if row:
            cfg = json.loads(row.value)
            if not cfg.get("enabled", True):
                logger.info("Scheduled ingestion is disabled, skipping.")
                return

        svc = IngestionService(db)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(svc.run_ingestion(source="sftp"))
        loop.close()
    except Exception as e:
        logger.error(f"Scheduled ingestion failed: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler for daily ingestion."""
    db = SessionLocal()
    try:
        row = db.query(Setting).filter(Setting.key == "ingest_schedule").first()
        hour = 6
        if row:
            cfg = json.loads(row.value)
            hour = cfg.get("cronHour", 6)
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
