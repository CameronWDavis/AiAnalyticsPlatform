from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Integer, Numeric, DateTime, Date, ForeignKey, UniqueConstraint, Computed, func
from sqlalchemy.orm import Mapped, mapped_column
from app.extensions import db

class UsageLog(db.Model):
    __tablename__ = "usage_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    model: Mapped[str] = mapped_column(nullable=False)
    platform: Mapped[str] = mapped_column(nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    
    total_tokens: Mapped[int] = mapped_column(
        Integer, 
        Computed("input_tokens + output_tokens", persisted=True), 
        nullable=False
    )
    
    request_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    estimated_cost_usd: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=10, scale=4), 
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id", "date", "model", "platform", 
            name="uq_user_date_model_platform"
        ),
    )

    def __repr__(self) -> str:
        return f"<UsageLog id={self.id} user_id={self.user_id} date={self.date} tokens={self.total_tokens}>"


    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date": self.date.isoformat() if self.date else None,
            "model": self.model,
            "platform": self.platform,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.total_tokens,
            "request_count": self.request_count,
            "estimated_cost_usd": float(self.estimated_cost_usd) if self.estimated_cost_usd is not None else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }