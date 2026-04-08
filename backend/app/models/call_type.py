from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, utcnow


class CallType(Base):
    __tablename__ = "call_types"
    __table_args__ = (
        UniqueConstraint("organization_id", "key", name="uq_call_types_org_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(50), index=True)  # e.g. "customer_support"
    name: Mapped[str] = mapped_column(String(100))  # e.g. "Customer Support"
    description: Mapped[str] = mapped_column(Text, default="")  # explanation for LLM
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    organization: Mapped["Organization"] = relationship(back_populates="call_types")  # noqa: F821
