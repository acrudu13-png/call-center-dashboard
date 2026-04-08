from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CallCounter(Base):
    """Per-organization counter for generating CALL-XXXX IDs.
    Each org gets its own monotonic counter so call IDs don't leak across tenants."""
    __tablename__ = "call_counters"

    organization_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    last_call_num: Mapped[int] = mapped_column(Integer, nullable=False, default=999)
