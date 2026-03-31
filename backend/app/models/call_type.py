from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base, utcnow


class CallType(Base):
    __tablename__ = "call_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # e.g. "customer_support"
    name: Mapped[str] = mapped_column(String(100))  # e.g. "Customer Support"
    description: Mapped[str] = mapped_column(Text, default="")  # explanation for LLM
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
