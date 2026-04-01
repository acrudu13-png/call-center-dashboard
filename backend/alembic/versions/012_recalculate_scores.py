"""Recalculate ai_total_earned/possible/qa_score from scorecard entries

Revision ID: 012_recalculate_scores
Revises: 011_call_types
"""

from alembic import op
import sqlalchemy as sa

revision = "012_recalculate_scores"
down_revision = "011_call_types"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE calls
        SET ai_total_earned = sub.total_earned,
            ai_total_possible = sub.total_possible,
            qa_score = CASE WHEN sub.total_possible > 0
                           THEN (sub.total_earned * 100.0 / sub.total_possible)
                           ELSE 0 END
        FROM (
            SELECT call_id,
                   SUM(score) AS total_earned,
                   SUM(max_score) AS total_possible
            FROM scorecard_entries
            GROUP BY call_id
        ) sub
        WHERE calls.id = sub.call_id
    """))


def downgrade():
    pass
