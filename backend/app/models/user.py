import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(200), default="")
    role: Mapped[str] = mapped_column(
        String(20), default="viewer"
    )  # admin | manager | viewer
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    allowed_agents: Mapped[list] = mapped_column(JSON, default=list)  # [] = all agents
    allowed_pages: Mapped[list] = mapped_column(JSON, default=list)   # [] = all pages
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )
