"""
Per-organization call_id counter helper.

Each organization has its own row in `call_counters`. The increment is done
with an atomic UPDATE...RETURNING so concurrent ingestion workers in the same
org get unique sequential numbers without race conditions.
"""

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_next_call_num(db: Session, org_id: str) -> int:
    """Atomically increment and return the next CALL-XXXX number for an org.

    If the counter row doesn't exist yet (e.g. an org created outside the API),
    it is bootstrapped from the org's existing max call_id (or 999 if empty)
    using INSERT ... ON CONFLICT DO NOTHING. The bootstrap and the increment
    run in the same transaction so concurrent calls are race-safe.
    """
    # Bootstrap: ensure a counter row exists for this org. No-op if it does.
    db.execute(
        text("""
            INSERT INTO call_counters (organization_id, last_call_num)
            SELECT :org_id, COALESCE(
                (
                    SELECT MAX(CAST(REPLACE(call_id, 'CALL-', '') AS INTEGER))
                    FROM calls
                    WHERE organization_id = :org_id
                      AND call_id LIKE 'CALL-%'
                      AND call_id ~ '^CALL-[0-9]+$'
                ),
                999
            )
            ON CONFLICT (organization_id) DO NOTHING
        """),
        {"org_id": org_id},
    )

    # Atomic increment + read. Row-level lock serializes parallel callers
    # so each one gets a unique number.
    next_num = db.execute(
        text("""
            UPDATE call_counters
            SET last_call_num = last_call_num + 1
            WHERE organization_id = :org_id
            RETURNING last_call_num
        """),
        {"org_id": org_id},
    ).scalar()

    if next_num is None:
        raise RuntimeError(f"Failed to allocate call_id for org {org_id}")

    return next_num


def reset_counter(db: Session, org_id: str, value: int) -> None:
    """Set the counter for an org to a specific value (used by seed scripts)."""
    db.execute(
        text("""
            INSERT INTO call_counters (organization_id, last_call_num)
            VALUES (:org_id, :val)
            ON CONFLICT (organization_id) DO UPDATE SET last_call_num = :val
        """),
        {"org_id": org_id, "val": value},
    )
