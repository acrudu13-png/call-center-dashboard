"""Multi-tenant: add organizations table and organization_id to all tenant-scoped tables

Revision ID: 015_multi_tenant
Revises: 014_call_metadata
"""

from alembic import op
from sqlalchemy import inspect
import sqlalchemy as sa

revision = "015_multi_tenant"
down_revision = "014_call_metadata"
branch_labels = None
depends_on = None

DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001"


def _has_column(inspector, table: str, column: str) -> bool:
    if table not in inspector.get_table_names():
        return False
    return any(c["name"] == column for c in inspector.get_columns(table))


def _add_org_id_column(inspector, table: str, nullable: bool = False):
    """Idempotently add organization_id column, backfill, FK, and index to a tenant table.
    Safe to re-run on partial state (e.g. when create_all already added the column)."""
    if not _has_column(inspector, table, "organization_id"):
        # Add as nullable so we can backfill, then alter to NOT NULL if requested
        op.add_column(table, sa.Column("organization_id", sa.String(36), nullable=True))

    # Backfill any NULL rows
    op.execute(f"UPDATE {table} SET organization_id = '{DEFAULT_ORG_ID}' WHERE organization_id IS NULL")

    # Set NOT NULL if required
    if not nullable:
        op.execute(f"ALTER TABLE {table} ALTER COLUMN organization_id SET NOT NULL")

    # Create FK if not present
    fks = inspector.get_foreign_keys(table) if table in inspector.get_table_names() else []
    has_fk = any(
        fk.get("referred_table") == "organizations"
        and "organization_id" in (fk.get("constrained_columns") or [])
        for fk in fks
    )
    if not has_fk:
        op.create_foreign_key(f"fk_{table}_org", table, "organizations", ["organization_id"], ["id"])

    # Create index if not present
    idx_name = f"ix_{table}_organization_id"
    existing_idx = {i["name"] for i in inspector.get_indexes(table)} if table in inspector.get_table_names() else set()
    if idx_name not in existing_idx:
        op.create_index(idx_name, table, ["organization_id"])


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    # 1. Create organizations table (idempotent — may have been created by create_all)
    if "organizations" not in inspector.get_table_names():
        op.create_table(
            "organizations",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("name", sa.String(200), unique=True, nullable=False),
            sa.Column("slug", sa.String(100), unique=True, nullable=False, index=True),
            sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )
        # Refresh inspector after schema change
        inspector = inspect(conn)

    # 2. Insert default organization (idempotent).
    # Specify all columns explicitly because the table may have been created
    # by Base.metadata.create_all() without the server defaults.
    op.execute(
        f"INSERT INTO organizations (id, name, slug, is_active, created_at, updated_at) "
        f"VALUES ('{DEFAULT_ORG_ID}', 'Default Organization', 'default', true, now(), now()) "
        f"ON CONFLICT (id) DO NOTHING"
    )

    # 3. Add organization_id to all tenant-scoped tables and backfill (idempotent)
    _add_org_id_column(inspector, "users", nullable=True)  # nullable for superadmin
    _add_org_id_column(inspector, "calls", nullable=False)
    _add_org_id_column(inspector, "qa_rules", nullable=False)
    _add_org_id_column(inspector, "call_types", nullable=False)
    _add_org_id_column(inspector, "subdirectories", nullable=False)
    _add_org_id_column(inspector, "ingestion_runs", nullable=False)
    _add_org_id_column(inspector, "transcription_jobs", nullable=False)
    _add_org_id_column(inspector, "log_entries", nullable=False)

    # -- settings: change PK from (key) to (organization_id, key) (idempotent)
    inspector = inspect(conn)
    if not _has_column(inspector, "settings", "organization_id"):
        op.add_column("settings", sa.Column("organization_id", sa.String(36), nullable=True))
        op.execute(f"UPDATE settings SET organization_id = '{DEFAULT_ORG_ID}' WHERE organization_id IS NULL")

        # Drop the old single-column PK and create composite PK
        op.execute("ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey")
        op.execute("ALTER TABLE settings ALTER COLUMN organization_id SET NOT NULL")
        op.create_primary_key("settings_pkey", "settings", ["organization_id", "key"])
        op.create_foreign_key("fk_settings_org", "settings", "organizations", ["organization_id"], ["id"])
    else:
        # Column exists; backfill any NULLs and ensure NOT NULL
        op.execute(f"UPDATE settings SET organization_id = '{DEFAULT_ORG_ID}' WHERE organization_id IS NULL")
        op.execute("ALTER TABLE settings ALTER COLUMN organization_id SET NOT NULL")

        # Make sure PK is composite
        pk = inspector.get_pk_constraint("settings")
        pk_cols = set(pk.get("constrained_columns") or [])
        if pk_cols != {"organization_id", "key"}:
            op.execute("ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey")
            op.create_primary_key("settings_pkey", "settings", ["organization_id", "key"])

        # Make sure FK exists
        fks = inspector.get_foreign_keys("settings")
        has_fk = any(
            fk.get("referred_table") == "organizations"
            and "organization_id" in (fk.get("constrained_columns") or [])
            for fk in fks
        )
        if not has_fk:
            op.create_foreign_key("fk_settings_org", "settings", "organizations", ["organization_id"], ["id"])

    # 4. Drop old unique constraints/indexes and create composite ones
    # Original models used unique=True, index=True which may have created unique INDEXES
    # rather than constraints. Drop both forms defensively.

    def _drop_unique(table: str, col: str):
        """Drop a unique constraint OR a unique index on a single column, whichever exists."""
        op.execute(f"""
            DO $$
            DECLARE
                cname text;
            BEGIN
                -- Try to find and drop a unique constraint on this column
                SELECT con.conname INTO cname
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
                WHERE rel.relname = '{table}'
                  AND con.contype = 'u'
                  AND att.attname = '{col}'
                  AND array_length(con.conkey, 1) = 1
                LIMIT 1;
                IF cname IS NOT NULL THEN
                    EXECUTE 'ALTER TABLE {table} DROP CONSTRAINT ' || quote_ident(cname);
                END IF;

                -- Also drop any unique index on this column (single-column only)
                FOR cname IN
                    SELECT i.relname
                    FROM pg_index idx
                    JOIN pg_class i ON i.oid = idx.indexrelid
                    JOIN pg_class t ON t.oid = idx.indrelid
                    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
                    WHERE t.relname = '{table}'
                      AND idx.indisunique = true
                      AND idx.indisprimary = false
                      AND a.attname = '{col}'
                      AND array_length(idx.indkey, 1) = 1
                LOOP
                    EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(cname);
                END LOOP;
            END $$;
        """)

    def _create_unique_if_missing(name: str, table: str, cols: list[str]):
        """Create a composite unique constraint only if one with this name doesn't exist."""
        inspector_local = inspect(conn)
        existing = {uc["name"] for uc in inspector_local.get_unique_constraints(table)}
        if name not in existing:
            op.create_unique_constraint(name, table, cols)

    # -- users: drop old unique on username and email
    _drop_unique("users", "username")
    _drop_unique("users", "email")
    _create_unique_if_missing("uq_users_org_username", "users", ["organization_id", "username"])
    _create_unique_if_missing("uq_users_org_email", "users", ["organization_id", "email"])

    # -- calls: drop old unique on call_id
    _drop_unique("calls", "call_id")
    _create_unique_if_missing("uq_calls_org_call_id", "calls", ["organization_id", "call_id"])

    # -- qa_rules: drop old unique on rule_id
    _drop_unique("qa_rules", "rule_id")
    _create_unique_if_missing("uq_rules_org_rule_id", "qa_rules", ["organization_id", "rule_id"])

    # -- call_types: drop old unique on key
    _drop_unique("call_types", "key")
    _create_unique_if_missing("uq_call_types_org_key", "call_types", ["organization_id", "key"])

    # -- subdirectories: drop old unique on key
    _drop_unique("subdirectories", "key")
    _create_unique_if_missing("uq_subdirectories_org_key", "subdirectories", ["organization_id", "key"])

    # 5. Update roles: first admin becomes superadmin (org_id = NULL), others become org_admin
    # The default admin (first admin created) becomes superadmin
    op.execute(
        "UPDATE users SET role = 'org_admin' WHERE role = 'admin'"
    )
    # The very first admin user (by created_at) becomes superadmin with NULL org
    op.execute(
        "UPDATE users SET role = 'superadmin', organization_id = NULL "
        "WHERE id = (SELECT id FROM users WHERE role = 'org_admin' ORDER BY created_at ASC LIMIT 1)"
    )


def downgrade():
    # Reverse role changes
    op.execute("UPDATE users SET role = 'admin' WHERE role IN ('superadmin', 'org_admin')")

    # Restore old unique constraints
    op.drop_constraint("uq_subdirectories_org_key", "subdirectories", type_="unique")
    op.create_unique_constraint("subdirectories_key_key", "subdirectories", ["key"])
    op.drop_constraint("uq_call_types_org_key", "call_types", type_="unique")
    op.create_unique_constraint("call_types_key_key", "call_types", ["key"])
    op.drop_constraint("uq_rules_org_rule_id", "qa_rules", type_="unique")
    op.create_unique_constraint("qa_rules_rule_id_key", "qa_rules", ["rule_id"])
    op.drop_constraint("uq_calls_org_call_id", "calls", type_="unique")
    op.create_unique_constraint("calls_call_id_key", "calls", ["call_id"])
    op.drop_constraint("uq_users_org_email", "users", type_="unique")
    op.drop_constraint("uq_users_org_username", "users", type_="unique")
    op.create_unique_constraint("users_email_key", "users", ["email"])
    op.create_unique_constraint("users_username_key", "users", ["username"])

    # Settings: restore old PK
    op.drop_constraint("fk_settings_org", "settings", type_="foreignkey")
    op.execute("ALTER TABLE settings DROP CONSTRAINT settings_pkey")
    op.create_primary_key("settings_pkey", "settings", ["key"])
    op.drop_column("settings", "organization_id")

    # Drop organization_id from all tables
    for table in ["log_entries", "transcription_jobs", "ingestion_runs",
                   "subdirectories", "call_types", "qa_rules", "calls", "users"]:
        op.drop_constraint(f"fk_{table}_org", table, type_="foreignkey")
        op.drop_index(f"ix_{table}_organization_id", table)
        op.drop_column(table, "organization_id")

    op.drop_table("organizations")
