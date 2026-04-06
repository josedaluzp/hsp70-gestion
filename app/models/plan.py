from sqlalchemy import Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Plan(Base):
    __tablename__ = "planes"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True)
    descripcion: Mapped[str | None] = mapped_column(Text)
    precio: Mapped[float] = mapped_column(Numeric(10, 2))
    duracion_dias: Mapped[int] = mapped_column(Integer)
    max_actividades: Mapped[int] = mapped_column(Integer)

    def __repr__(self) -> str:
        return f"<Plan {self.id}: {self.nombre}>"
