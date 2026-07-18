from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.extensions import db 

class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )

    def to_dict(self) -> dict:
        return {
        "id": self.id,
        "name": self.name,
        "email": self.email,
        "created_at": self.created_at.isoformat() if self.created_at else None,
    }

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"