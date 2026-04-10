import os
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Use TZ env var. Default to Europe/Bucharest. Uses zoneinfo for proper DST.
_TZ_NAME = os.getenv("TZ", "Europe/Bucharest")
APP_TZ = ZoneInfo(_TZ_NAME)


def now() -> datetime:
    """Current time in the app timezone (DST-aware)."""
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
