"""Add ingestion_run_id to calls table

Revision ID: 003_call_run_id
Revises: 002_ingestion_runs
Create Date: 2026-03-28
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_call_run_id"
down_revision: Union[str, None] = "002_ingestion_runs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("calls", sa.Column("ingestion_run_id", sa.String(50), nullable=True, index=True))


def downgrade() -> None:
    op.drop_column("calls", "ingestion_run_id")
