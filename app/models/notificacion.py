from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    tipo: Mapped[str] = mapped_column(String(50))
    mensaje: Mapped[str] = mapped_column(Text)
    leida: Mapped[bool] = mapped_column(Boolean, default=False)
    fecha: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    usuario: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="notificaciones", foreign_keys=[usuario_id]
    )

    def __repr__(self) -> str:
        return f"<Notificacion {self.id}: tipo={self.tipo} leida={self.leida}>"
