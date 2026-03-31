"""Add allowed_agents and allowed_pages to users

Revision ID: 010_user_permissions
Revises: 009_is_eligible
"""

from alembic import op
import sqlalchemy as sa

revision = "010_user_permissions"
down_revision = "009_is_eligible"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("allowed_agents", sa.JSON(), server_default="[]", nullable=False))
    op.add_column("users", sa.Column("allowed_pages", sa.JSON(), server_default="[]", nullable=False))


def downgrade():
    op.drop_column("users", "allowed_pages")
    op.drop_column("users", "allowed_agents")
