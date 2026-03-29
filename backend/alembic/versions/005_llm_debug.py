"""Add llm_request and llm_response to calls

Revision ID: 005_llm_debug
Revises: 004_users
"""

from alembic import op
import sqlalchemy as sa

revision = "005_llm_debug"
down_revision = "004_users"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("calls", sa.Column("llm_request", sa.Text(), nullable=True))
    op.add_column("calls", sa.Column("llm_response", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("calls", "llm_response")
    op.drop_column("calls", "llm_request")
