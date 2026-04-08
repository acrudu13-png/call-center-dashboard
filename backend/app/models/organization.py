import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, utcnow


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), unique=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )

    # Relationships
    users: Mapped[list["User"]] = relationship(back_populates="organization")  # noqa: F821
    calls: Mapped[list["Call"]] = relationship(back_populates="organization")  # noqa: F821
    rules: Mapped[list["QARule"]] = relationship(back_populates="organization")  # noqa: F821
    call_types: Mapped[list["CallType"]] = relationship(back_populates="organization")  # noqa: F821
    subdirectories: Mapped[list["Subdirectory"]] = relationship(back_populates="organization")  # noqa: F821
