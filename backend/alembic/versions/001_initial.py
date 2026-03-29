"""Initial migration - create all tables

Revision ID: 001_initial
Revises:
Create Date: 2026-03-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Calls
    op.create_table(
        "calls",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("call_id", sa.String(20), unique=True, index=True, nullable=False),
        sa.Column("date_time", sa.DateTime(timezone=True), index=True),
        sa.Column("agent_name", sa.String(120), nullable=False),
        sa.Column("agent_id", sa.String(20), index=True, nullable=False),
        sa.Column("customer_phone", sa.String(30), nullable=False),
        sa.Column("duration", sa.Integer, nullable=False),
        sa.Column("qa_score", sa.Float, default=0),
        sa.Column("status", sa.String(20), default="processing", index=True),
        sa.Column("rules_failed", sa.JSON, default=[]),
        sa.Column("compliance_pass", sa.Boolean, default=True),
        sa.Column("audio_file_path", sa.String(500), nullable=True),
        sa.Column("raw_json", sa.JSON, default={}),
        sa.Column("ai_summary", sa.Text, nullable=True),
        sa.Column("ai_grade", sa.String(20), nullable=True),
        sa.Column("ai_improvement_advice", sa.JSON, nullable=True),
        sa.Column("ai_total_earned", sa.Float, nullable=True),
        sa.Column("ai_total_possible", sa.Float, nullable=True),
        sa.Column("has_critical_failure", sa.Boolean, default=False),
        sa.Column("critical_failure_reason", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, default=sa.func.now()),
    )

    # Transcript lines
    op.create_table(
        "transcript_lines",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("call_id", sa.String(36), sa.ForeignKey("calls.id", ondelete="CASCADE"), index=True),
        sa.Column("speaker", sa.String(30), nullable=False),
        sa.Column("timestamp", sa.Float, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
    )

    # Scorecard entries
    op.create_table(
        "scorecard_entries",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("call_id", sa.String(36), sa.ForeignKey("calls.id", ondelete="CASCADE"), index=True),
        sa.Column("rule_id", sa.String(30), nullable=False),
        sa.Column("rule_title", sa.String(200), nullable=False),
        sa.Column("passed", sa.Boolean, nullable=False),
        sa.Column("score", sa.Float, nullable=False),
        sa.Column("max_score", sa.Float, nullable=False),
        sa.Column("details", sa.Text, default=""),
        sa.Column("extracted_value", sa.Text, nullable=True),
    )

    # QA Rules
    op.create_table(
        "qa_rules",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("rule_id", sa.String(30), unique=True, index=True, nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text, default=""),
        sa.Column("section", sa.String(100), nullable=False),
        sa.Column("rule_type", sa.String(20), default="scoring"),
        sa.Column("max_score", sa.Float, default=0),
        sa.Column("enabled", sa.Boolean, default=True),
        sa.Column("is_critical", sa.Boolean, default=False),
        sa.Column("sort_order", sa.Integer, default=0),
        sa.Column("created_at", sa.DateTime, default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, default=sa.func.now()),
    )

    # Transcription jobs
    op.create_table(
        "transcription_jobs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("job_id", sa.String(50), unique=True, index=True, nullable=False),
        sa.Column("file_name", sa.String(300), nullable=False),
        sa.Column("source", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), default="queued", index=True),
        sa.Column("progress", sa.Float, default=0),
        sa.Column("call_id", sa.String(36), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("job_metadata", sa.JSON, default={}),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, default=sa.func.now()),
    )

    # Log entries
    op.create_table(
        "log_entries",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("timestamp", sa.DateTime, default=sa.func.now(), index=True),
        sa.Column("level", sa.String(10), default="info"),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column("job_id", sa.String(50), nullable=True, index=True),
    )

    # Settings
    op.create_table(
        "settings",
        sa.Column("key", sa.String(100), primary_key=True),
        sa.Column("value", sa.Text, default="{}"),
        sa.Column("updated_at", sa.DateTime, default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("settings")
    op.drop_table("log_entries")
    op.drop_table("transcription_jobs")
    op.drop_table("qa_rules")
    op.drop_table("scorecard_entries")
    op.drop_table("transcript_lines")
    op.drop_table("calls")
