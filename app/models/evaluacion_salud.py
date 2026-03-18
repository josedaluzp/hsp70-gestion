from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EvaluacionSalud(Base):
    __tablename__ = "evaluaciones_salud"

    id: Mapped[int] = mapped_column(primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    profesional_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    fecha: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    peso_kg: Mapped[float | None] = mapped_column(Numeric(5, 2))
    altura_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    imc: Mapped[float | None] = mapped_column(Numeric(5, 2))
    grasa_corporal: Mapped[float | None] = mapped_column(Numeric(5, 2))
    objetivo: Mapped[str | None] = mapped_column(Text)
    notas: Mapped[str | None] = mapped_column(Text)

    # Relationships
    alumno: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="evaluaciones_como_alumno",
        foreign_keys=[alumno_id],
    )
    profesional: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="evaluaciones_como_profesional",
        foreign_keys=[profesional_id],
    )

    def __repr__(self) -> str:
        return f"<EvaluacionSalud {self.id}: alumno={self.alumno_id}>"
