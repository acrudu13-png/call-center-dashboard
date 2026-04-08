from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, utcnow


class QARule(Base):
    __tablename__ = "qa_rules"
    __table_args__ = (
        UniqueConstraint("organization_id", "rule_id", name="uq_rules_org_rule_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=False, index=True
    )
    rule_id: Mapped[str] = mapped_column(String(30), index=True)  # rule-001
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    section: Mapped[str] = mapped_column(String(100))  # e.g. "I. Deschiderea apelului"
    rule_type: Mapped[str] = mapped_column(
        String(20), default="scoring"
    )  # scoring | extraction
    max_score: Mapped[float] = mapped_column(Float, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False)
    direction: Mapped[str] = mapped_column(String(10), default="both")  # inbound | outbound | both
    call_types: Mapped[list] = mapped_column(JSON, default=list)  # [] = all types, ["sales", "support"] = specific
    subdirectories: Mapped[list] = mapped_column(JSON, default=list)  # [] = all subdirs, ["HOTEL", "OUTBOUND"] = specific
    metadata_conditions: Mapped[list] = mapped_column(JSON, default=list)  # [{"field":"x","operator":"equals","value":"y"}]
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    organization: Mapped["Organization"] = relationship(back_populates="rules")  # noqa: F821
