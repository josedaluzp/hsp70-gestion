from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EstadoInscripcion


class Inscripcion(Base):
    __tablename__ = "inscripciones"
    __table_args__ = (
        UniqueConstraint("alumno_id", "turno_id", name="uq_alumno_turno"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    turno_id: Mapped[int] = mapped_column(ForeignKey("turnos.id"))
    estado: Mapped[EstadoInscripcion] = mapped_column(
        default=EstadoInscripcion.ACTIVA
    )
    fecha_inscripcion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    alumno: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="inscripciones", foreign_keys=[alumno_id]
    )
    turno: Mapped["Turno"] = relationship(  # noqa: F821
        back_populates="inscripciones"
    )
    asistencias: Mapped[list["Asistencia"]] = relationship(  # noqa: F821
        back_populates="inscripcion"
    )

    def __repr__(self) -> str:
        return f"<Inscripcion {self.id}: alumno={self.alumno_id} turno={self.turno_id}>"
