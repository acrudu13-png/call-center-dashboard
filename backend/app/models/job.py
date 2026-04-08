from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, Text, JSON, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, utcnow


class IngestionRun(Base):
    """Ingestion batch record."""
    __tablename__ = "ingestion_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=False, index=True
    )
    run_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(10))  # sftp | s3
    status: Mapped[str] = mapped_column(
        String(20), default="downloading", index=True
    )  # downloading | processing | stopping | completed | failed | stopped
    remote_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    total_files: Mapped[int] = mapped_column(Integer, default=0)
    downloaded_files: Mapped[int] = mapped_column(Integer, default=0)
    processed_files: Mapped[int] = mapped_column(Integer, default=0)
    failed_files: Mapped[int] = mapped_column(Integer, default=0)
    current_file: Mapped[str | None] = mapped_column(String(300), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class TranscriptionJob(Base):
    __tablename__ = "transcription_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=False, index=True
    )
    job_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    file_name: Mapped[str] = mapped_column(String(300))
    source: Mapped[str] = mapped_column(String(10))  # sftp | s3
    status: Mapped[str] = mapped_column(
        String(20), default="queued", index=True
    )  # queued | transcribing | analyzing | completed | failed
    progress: Mapped[float] = mapped_column(Float, default=0)  # 0-100
    call_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_metadata: Mapped[dict] = mapped_column(JSON, default=dict)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class LogEntry(Base):
    __tablename__ = "log_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    level: Mapped[str] = mapped_column(String(10), default="info")  # info | warn | error | debug
    source: Mapped[str] = mapped_column(String(50))  # ingestion | transcription | analysis | webhook
    message: Mapped[str] = mapped_column(Text)
    job_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
