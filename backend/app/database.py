import os
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Use TZ env var. Default to Europe/Bucharest (UTC+3 EEST / UTC+2 EET).
# For simplicity we use a fixed +3 offset. For DST-aware, use zoneinfo.
_TZ_NAME = os.getenv("TZ", "Europe/Bucharest")
_TZ_OFFSET = timedelta(hours=3)  # Romania EEST
APP_TZ = timezone(_TZ_OFFSET)


def now() -> datetime:
    """Current time in the app timezone (Europe/Bucharest)."""
    return datetime.now(APP_TZ)


# Keep utcnow as alias for backward compat
utcnow = now

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
