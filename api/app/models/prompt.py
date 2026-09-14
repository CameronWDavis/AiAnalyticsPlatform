from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.extensions import db

class Prompt(db.Model):
    __tablename__ = "prompts"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), 
        nullable=True
    )
    
    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    platform: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<Prompt id={self.id} user_id={self.user_id} model={self.model!r}>"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "category_id": self.category_id,
            "prompt_text": self.prompt_text,
            "response_text": self.response_text,
            "model": self.model,
            "platform": self.platform,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }