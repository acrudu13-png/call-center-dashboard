"""Normalize settings keys from underscores to hyphens

Some settings were saved with underscore keys (ingest_schedule, metadata_mapping,
main_prompt, call_context) by the settings router, while the ingestion service
and frontend used hyphen keys (ingest-schedule, etc.). This migration normalizes
all existing rows to hyphen-style.

Revision ID: 017_fix_settings_keys
Revises: 016_per_org_call_counter
"""

from alembic import op

revision = "017_fix_settings_keys"
down_revision = "016_per_org_call_counter"
branch_labels = None
depends_on = None

KEY_RENAMES = {
    "ingest_schedule": "ingest-schedule",
    "metadata_mapping": "metadata-mapping",
    "main_prompt": "main-prompt",
    "call_context": "call-context",
}


def upgrade():
    for old_key, new_key in KEY_RENAMES.items():
        # Only rename if the new key doesn't already exist for that org.
        # If both exist (some orgs saved via router, some via frontend), keep the
        # underscore one (router-saved, more likely to be recent) and delete the hyphen one.
        op.execute(f"""
            DELETE FROM settings
            WHERE key = '{new_key}'
              AND organization_id IN (
                  SELECT organization_id FROM settings WHERE key = '{old_key}'
              )
        """)
        op.execute(f"""
            UPDATE settings SET key = '{new_key}' WHERE key = '{old_key}'
        """)


def downgrade():
    for old_key, new_key in KEY_RENAMES.items():
        op.execute(f"""
            UPDATE settings SET key = '{old_key}' WHERE key = '{new_key}'
        """)
