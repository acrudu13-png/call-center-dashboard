"""Add processed_at to calls

Revision ID: 006_processed_at
Revises: 005_llm_debug
"""

from alembic import op
import sqlalchemy as sa

revision = "006_processed_at"
down_revision = "005_llm_debug"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("calls", sa.Column("processed_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("calls", "processed_at")
