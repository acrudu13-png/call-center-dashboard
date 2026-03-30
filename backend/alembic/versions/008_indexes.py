"""Add composite indexes for query performance

Revision ID: 008_indexes
Revises: 007_call_direction
"""

from alembic import op

revision = "008_indexes"
down_revision = "007_call_direction"
branch_labels = None
depends_on = None


def upgrade():
    # calls: list page sorts by date_time with various filters
    op.create_index("ix_calls_status_date_time", "calls", ["status", "date_time"])
    op.create_index("ix_calls_agent_id_date_time", "calls", ["agent_id", "date_time"])
    op.create_index("ix_calls_direction_date_time", "calls", ["direction", "date_time"])
    op.create_index("ix_calls_qa_score", "calls", ["qa_score"])
    op.create_index("ix_calls_agent_id_qa_score", "calls", ["agent_id", "qa_score"])

    # calls: text search on call_id, agent_name, customer_phone (trigram would be ideal but basic btree helps)
    op.create_index("ix_calls_agent_name", "calls", ["agent_name"])
    op.create_index("ix_calls_customer_phone", "calls", ["customer_phone"])

    # scorecard_entries: bulk lookup by call_id for export and detail
    op.create_index("ix_scorecard_call_id_rule_id", "scorecard_entries", ["call_id", "rule_id"])

    # transcript_lines: ordered by timestamp per call
    op.create_index("ix_transcript_call_id_timestamp", "transcript_lines", ["call_id", "timestamp"])

    # log_entries: filtered by level/source, sorted by timestamp
    op.create_index("ix_log_entries_level_timestamp", "log_entries", ["level", "timestamp"])
    op.create_index("ix_log_entries_source_timestamp", "log_entries", ["source", "timestamp"])

    # transcription_jobs: filtered by status, sorted by created_at
    op.create_index("ix_jobs_status_created_at", "transcription_jobs", ["status", "created_at"])

    # ingestion_runs: sorted by started_at
    op.create_index("ix_runs_started_at", "ingestion_runs", ["started_at"])


def downgrade():
    op.drop_index("ix_runs_started_at", "ingestion_runs")
    op.drop_index("ix_jobs_status_created_at", "transcription_jobs")
    op.drop_index("ix_log_entries_source_timestamp", "log_entries")
    op.drop_index("ix_log_entries_level_timestamp", "log_entries")
    op.drop_index("ix_transcript_call_id_timestamp", "transcript_lines")
    op.drop_index("ix_scorecard_call_id_rule_id", "scorecard_entries")
    op.drop_index("ix_calls_customer_phone", "calls")
    op.drop_index("ix_calls_agent_name", "calls")
    op.drop_index("ix_calls_agent_id_qa_score", "calls")
    op.drop_index("ix_calls_qa_score", "calls")
    op.drop_index("ix_calls_direction_date_time", "calls")
    op.drop_index("ix_calls_agent_id_date_time", "calls")
    op.drop_index("ix_calls_status_date_time", "calls")
