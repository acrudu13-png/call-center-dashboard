"""Add direction to calls and qa_rules

Revision ID: 007_call_direction
Revises: 006_processed_at
"""

from alembic import op
import sqlalchemy as sa

revision = "007_call_direction"
down_revision = "006_processed_at"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("calls", sa.Column("direction", sa.String(10), server_default="unknown", nullable=False))
    op.create_index("ix_calls_direction", "calls", ["direction"])
    op.add_column("qa_rules", sa.Column("direction", sa.String(10), server_default="both", nullable=False))


def downgrade():
    op.drop_column("qa_rules", "direction")
    op.drop_index("ix_calls_direction", "calls")
    op.drop_column("calls", "direction")
