"""Add ingestion_runs table for persistent progress tracking

Revision ID: 002_ingestion_runs
Revises: 001_initial
Create Date: 2026-03-27
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_ingestion_runs"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ingestion_runs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("run_id", sa.String(50), unique=True, index=True, nullable=False),
        sa.Column("source", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), default="downloading", index=True),
        sa.Column("remote_path", sa.String(500), nullable=True),
        sa.Column("total_files", sa.Integer, default=0),
        sa.Column("downloaded_files", sa.Integer, default=0),
        sa.Column("processed_files", sa.Integer, default=0),
        sa.Column("failed_files", sa.Integer, default=0),
        sa.Column("current_file", sa.String(300), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("started_at", sa.DateTime, default=sa.func.now()),
        sa.Column("completed_at", sa.DateTime, nullable=True),
    )


def downgrade() -> None:
    op.drop_table("ingestion_runs")
