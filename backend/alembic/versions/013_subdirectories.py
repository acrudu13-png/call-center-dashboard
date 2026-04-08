"""Add subdirectories table, subdirectory column on calls, subdirectories filter on rules

Revision ID: 013_subdirectories
Revises: 012_recalculate_scores
"""

from alembic import op
import sqlalchemy as sa

revision = "013_subdirectories"
down_revision = "012_recalculate_scores"
branch_labels = None
depends_on = None


def upgrade():
    # Subdirectories table
    op.create_table(
        "subdirectories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("display_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("direction", sa.String(10), nullable=False, server_default="unknown"),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("discovered_from", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Add subdirectory to calls (which subdirectory the file came from)
    op.add_column("calls", sa.Column("subdirectory", sa.String(100), nullable=True, index=True))

    # Add subdirectories filter to qa_rules (same pattern as call_types)
    op.add_column("qa_rules", sa.Column("subdirectories", sa.JSON(), server_default="[]", nullable=False))


def downgrade():
    op.drop_column("qa_rules", "subdirectories")
    op.drop_column("calls", "subdirectory")
    op.drop_table("subdirectories")
