from datetime import time

from sqlalchemy import Boolean, ForeignKey, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import DiaSemana


class Turno(Base):
    __tablename__ = "turnos"

    id: Mapped[int] = mapped_column(primary_key=True)
    actividad_id: Mapped[int] = mapped_column(ForeignKey("actividades.id"))
    profesor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    dia_semana: Mapped[DiaSemana]
    hora_inicio: Mapped[time] = mapped_column(Time)
    hora_fin: Mapped[time] = mapped_column(Time)
    sala: Mapped[str | None] = mapped_column(String(50))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    actividad: Mapped["Actividad"] = relationship(  # noqa: F821
        back_populates="turnos"
    )
    profesor: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="turnos_profesor", foreign_keys=[profesor_id]
    )
    inscripciones: Mapped[list["Inscripcion"]] = relationship(  # noqa: F821
        back_populates="turno"
    )
    lista_espera: Mapped[list["ListaEspera"]] = relationship(  # noqa: F821
        back_populates="turno"
    )

    def __repr__(self) -> str:
        return f"<Turno {self.id}: {self.dia_semana.value} {self.hora_inicio}>"
