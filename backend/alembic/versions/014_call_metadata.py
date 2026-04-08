"""Add metadata JSON column to calls, metadata_conditions to rules

Revision ID: 014_call_metadata
Revises: 013_subdirectories
"""

from alembic import op
import sqlalchemy as sa

revision = "014_call_metadata"
down_revision = "013_subdirectories"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("calls", sa.Column("metadata", sa.JSON(), server_default="{}", nullable=False))
    op.add_column("qa_rules", sa.Column("metadata_conditions", sa.JSON(), server_default="[]", nullable=False))


def downgrade():
    op.drop_column("qa_rules", "metadata_conditions")
    op.drop_column("calls", "metadata")
