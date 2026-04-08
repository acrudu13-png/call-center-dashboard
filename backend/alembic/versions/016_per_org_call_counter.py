"""Per-organization call_id counters

Replaces the global call_id_seq sequence with a per-org counter table so each
organization gets its own monotonic CALL-XXXX numbering.

Revision ID: 016_per_org_call_counter
Revises: 015_multi_tenant
"""

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa

revision = "016_per_org_call_counter"
down_revision = "015_multi_tenant"
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create the counter table (idempotent — Base.metadata.create_all in
    #    a prior startup may have already created it from the SQLAlchemy model).
    conn = op.get_bind()
    inspector = inspect(conn)
    if "call_counters" not in inspector.get_table_names():
        op.create_table(
            "call_counters",
            sa.Column("organization_id", sa.String(36), primary_key=True),
            sa.Column("last_call_num", sa.Integer(), nullable=False, server_default="999"),
            sa.ForeignKeyConstraint(
                ["organization_id"], ["organizations.id"], ondelete="CASCADE"
            ),
        )

    # 2. Backfill: for each org, set last_call_num to the max existing CALL-XXXX number
    #    (or 999 if the org has no calls yet, so the next one will be CALL-1000).
    #    ON CONFLICT DO NOTHING makes this idempotent if some rows already exist.
    op.execute("""
        INSERT INTO call_counters (organization_id, last_call_num)
        SELECT
            o.id,
            COALESCE(
                (
                    SELECT MAX(CAST(REPLACE(c.call_id, 'CALL-', '') AS INTEGER))
                    FROM calls c
                    WHERE c.organization_id = o.id
                      AND c.call_id LIKE 'CALL-%'
                      AND c.call_id ~ '^CALL-[0-9]+$'
                ),
                999
            )
        FROM organizations o
        ON CONFLICT (organization_id) DO NOTHING
    """)

    # 3. Drop the old global sequence (no longer used)
    op.execute("DROP SEQUENCE IF EXISTS call_id_seq")


def downgrade():
    # Recreate global sequence and sync it to overall max
    op.execute("CREATE SEQUENCE IF NOT EXISTS call_id_seq")
    op.execute("""
        SELECT setval(
            'call_id_seq',
            COALESCE(
                (
                    SELECT MAX(CAST(REPLACE(call_id, 'CALL-', '') AS INTEGER))
                    FROM calls
                    WHERE call_id LIKE 'CALL-%'
                      AND call_id ~ '^CALL-[0-9]+$'
                ),
                999
            )
        )
    """)
    op.drop_table("call_counters")
