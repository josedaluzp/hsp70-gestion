from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Actividad(Base):
    __tablename__ = "actividades"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)
    cupo_maximo: Mapped[int] = mapped_column(Integer)
    duracion_min: Mapped[int] = mapped_column(Integer)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    turnos: Mapped[list["Turno"]] = relationship(  # noqa: F821
        back_populates="actividad"
    )

    def __repr__(self) -> str:
        return f"<Actividad {self.id}: {self.nombre}>"
