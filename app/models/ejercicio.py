from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ejercicio(Base):
    __tablename__ = "ejercicios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), unique=True)
    video_url: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    rutina_ejercicios: Mapped[list["RutinaEjercicio"]] = relationship(  # noqa: F821
        back_populates="ejercicio", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Ejercicio {self.id}: {self.nombre}>"
