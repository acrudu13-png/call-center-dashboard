"""Add is_eligible and ineligible_reason to calls

Revision ID: 009_is_eligible
Revises: 008_indexes
"""

from alembic import op
import sqlalchemy as sa

revision = "009_is_eligible"
down_revision = "008_indexes"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("calls", sa.Column("is_eligible", sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column("calls", sa.Column("ineligible_reason", sa.Text(), nullable=True))
    op.create_index("ix_calls_is_eligible", "calls", ["is_eligible"])


def downgrade():
    op.drop_index("ix_calls_is_eligible", "calls")
    op.drop_column("calls", "ineligible_reason")
    op.drop_column("calls", "is_eligible")
