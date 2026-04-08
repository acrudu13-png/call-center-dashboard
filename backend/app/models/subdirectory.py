from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, utcnow


class Subdirectory(Base):
    __tablename__ = "subdirectories"
    __table_args__ = (
        UniqueConstraint("organization_id", "key", name="uq_subdirectories_org_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), nullable=False, index=True
    )
    key: Mapped[str] = mapped_column(String(100), index=True)  # e.g. "HOTEL", "OUTBOUND"
    display_name: Mapped[str] = mapped_column(String(200), default="")
    direction: Mapped[str] = mapped_column(String(10), default="unknown")  # inbound | outbound | both | unknown
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    discovered_from: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    organization: Mapped["Organization"] = relationship(back_populates="subdirectories")  # noqa: F821
