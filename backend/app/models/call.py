import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, utcnow


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # CALL-1000 etc.
    date_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    agent_name: Mapped[str] = mapped_column(String(120))
    agent_id: Mapped[str] = mapped_column(String(20), index=True)
    customer_phone: Mapped[str] = mapped_column(String(30))
    duration: Mapped[int] = mapped_column(Integer)  # seconds
    qa_score: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(
        String(20), default="processing", index=True
    )  # completed | in_review | flagged | processing
    rules_failed: Mapped[list] = mapped_column(JSON, default=list)
    compliance_pass: Mapped[bool] = mapped_column(Boolean, default=True)
    audio_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ingestion_run_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    raw_json: Mapped[dict] = mapped_column(JSON, default=dict)

    # AI analysis results
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ai_improvement_advice: Mapped[list | None] = mapped_column(JSON, nullable=True)
    ai_total_earned: Mapped[float | None] = mapped_column(Float, nullable=True)
    ai_total_possible: Mapped[float | None] = mapped_column(Float, nullable=True)
    has_critical_failure: Mapped[bool] = mapped_column(Boolean, default=False)
    critical_failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_request: Mapped[str | None] = mapped_column(Text, nullable=True)
    llm_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    # Relationships
    transcript_lines: Mapped[list["TranscriptLine"]] = relationship(
        back_populates="call", cascade="all, delete-orphan", order_by="TranscriptLine.timestamp"
    )
    scorecard_entries: Mapped[list["ScorecardEntry"]] = relationship(
        back_populates="call", cascade="all, delete-orphan"
    )


class TranscriptLine(Base):
    __tablename__ = "transcript_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    call_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("calls.id", ondelete="CASCADE"), index=True
    )
    speaker: Mapped[str] = mapped_column(String(30))
    timestamp: Mapped[float] = mapped_column(Float)  # seconds from start
    text: Mapped[str] = mapped_column(Text)

    call: Mapped["Call"] = relationship(back_populates="transcript_lines")


class ScorecardEntry(Base):
    __tablename__ = "scorecard_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    call_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("calls.id", ondelete="CASCADE"), index=True
    )
    rule_id: Mapped[str] = mapped_column(String(30))
    rule_title: Mapped[str] = mapped_column(String(200))
    passed: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[float] = mapped_column(Float)
    max_score: Mapped[float] = mapped_column(Float)
    details: Mapped[str] = mapped_column(Text, default="")
    extracted_value: Mapped[str | None] = mapped_column(Text, nullable=True)

    call: Mapped["Call"] = relationship(back_populates="scorecard_entries")
