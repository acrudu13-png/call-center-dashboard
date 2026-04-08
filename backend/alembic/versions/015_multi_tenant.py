"""Multi-tenant: add organizations table and organization_id to all tenant-scoped tables

Revision ID: 015_multi_tenant
Revises: 014_call_metadata
"""

from alembic import op
import sqlalchemy as sa

revision = "015_multi_tenant"
down_revision = "014_call_metadata"
branch_labels = None
depends_on = None

DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001"


def upgrade():
    # 1. Create organizations table
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), unique=True, nullable=False),
        sa.Column("slug", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    # 2. Insert default organization
    op.execute(
        f"INSERT INTO organizations (id, name, slug) "
        f"VALUES ('{DEFAULT_ORG_ID}', 'Default Organization', 'default')"
    )

    # 3. Add organization_id to all tenant-scoped tables and backfill

    # -- users (nullable for superadmin)
    op.add_column("users", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE users SET organization_id = '{DEFAULT_ORG_ID}'")
    op.create_foreign_key("fk_users_org", "users", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_users_organization_id", "users", ["organization_id"])

    # -- calls
    op.add_column("calls", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE calls SET organization_id = '{DEFAULT_ORG_ID}'")
    op.alter_column("calls", "organization_id", nullable=False)
    op.create_foreign_key("fk_calls_org", "calls", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_calls_organization_id", "calls", ["organization_id"])

    # -- qa_rules
    op.add_column("qa_rules", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE qa_rules SET organization_id = '{DEFAULT_ORG_ID}'")
    op.alter_column("qa_rules", "organization_id", nullable=False)
    op.create_foreign_key("fk_rules_org", "qa_rules", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_qa_rules_organization_id", "qa_rules", ["organization_id"])

    # -- call_types
    op.add_column("call_types", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE call_types SET organization_id = '{DEFAULT_ORG_ID}'")
    op.alter_column("call_types", "organization_id", nullable=False)
    op.create_foreign_key("fk_call_types_org", "call_types", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_call_types_organization_id", "call_types", ["organization_id"])

    # -- subdirectories
    op.add_column("subdirectories", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE subdirectories SET organization_id = '{DEFAULT_ORG_ID}'")
    op.alter_column("subdirectories", "organization_id", nullable=False)
    op.create_foreign_key("fk_subdirectories_org", "subdirectories", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_subdirectories_organization_id", "subdirectories", ["organization_id"])

    # -- ingestion_runs
    op.add_column("ingestion_runs", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE ingestion_runs SET organization_id = '{DEFAULT_ORG_ID}'")
    op.alter_column("ingestion_runs", "organization_id", nullable=False)
    op.create_foreign_key("fk_ingestion_runs_org", "ingestion_runs", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_ingestion_runs_organization_id", "ingestion_runs", ["organization_id"])

    # -- transcription_jobs
    op.add_column("transcription_jobs", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE transcription_jobs SET organization_id = '{DEFAULT_ORG_ID}'")
    op.alter_column("transcription_jobs", "organization_id", nullable=False)
    op.create_foreign_key("fk_transcription_jobs_org", "transcription_jobs", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_transcription_jobs_organization_id", "transcription_jobs", ["organization_id"])

    # -- log_entries
    op.add_column("log_entries", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE log_entries SET organization_id = '{DEFAULT_ORG_ID}'")
    op.alter_column("log_entries", "organization_id", nullable=False)
    op.create_foreign_key("fk_log_entries_org", "log_entries", "organizations", ["organization_id"], ["id"])
    op.create_index("ix_log_entries_organization_id", "log_entries", ["organization_id"])

    # -- settings: change PK from (key) to (organization_id, key)
    op.add_column("settings", sa.Column("organization_id", sa.String(36), nullable=True))
    op.execute(f"UPDATE settings SET organization_id = '{DEFAULT_ORG_ID}'")
    op.execute("ALTER TABLE settings DROP CONSTRAINT settings_pkey")
    op.alter_column("settings", "organization_id", nullable=False)
    op.create_primary_key("settings_pkey", "settings", ["organization_id", "key"])
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

    # -- users: drop old unique on username and email
    _drop_unique("users", "username")
    _drop_unique("users", "email")
    op.create_unique_constraint("uq_users_org_username", "users", ["organization_id", "username"])
    op.create_unique_constraint("uq_users_org_email", "users", ["organization_id", "email"])

    # -- calls: drop old unique on call_id
    _drop_unique("calls", "call_id")
    op.create_unique_constraint("uq_calls_org_call_id", "calls", ["organization_id", "call_id"])

    # -- qa_rules: drop old unique on rule_id
    _drop_unique("qa_rules", "rule_id")
    op.create_unique_constraint("uq_rules_org_rule_id", "qa_rules", ["organization_id", "rule_id"])

    # -- call_types: drop old unique on key
    _drop_unique("call_types", "key")
    op.create_unique_constraint("uq_call_types_org_key", "call_types", ["organization_id", "key"])

    # -- subdirectories: drop old unique on key
    _drop_unique("subdirectories", "key")
    op.create_unique_constraint("uq_subdirectories_org_key", "subdirectories", ["organization_id", "key"])

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
