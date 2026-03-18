from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import RolUsuario


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    apellido: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    telefono: Mapped[str | None] = mapped_column(String(50))
    dni: Mapped[str | None] = mapped_column(String(20), unique=True, index=True)
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date)
    rol: Mapped[RolUsuario] = mapped_column(default=RolUsuario.ALUMNO)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    turnos_profesor: Mapped[list["Turno"]] = relationship(  # noqa: F821
        back_populates="profesor", foreign_keys="Turno.profesor_id"
    )
    inscripciones: Mapped[list["Inscripcion"]] = relationship(  # noqa: F821
        back_populates="alumno", foreign_keys="Inscripcion.alumno_id"
    )
    pagos: Mapped[list["Pago"]] = relationship(  # noqa: F821
        back_populates="alumno", foreign_keys="Pago.alumno_id"
    )
    evaluaciones_como_alumno: Mapped[list["EvaluacionSalud"]] = relationship(  # noqa: F821
        back_populates="alumno", foreign_keys="EvaluacionSalud.alumno_id"
    )
    evaluaciones_como_profesional: Mapped[list["EvaluacionSalud"]] = relationship(  # noqa: F821
        back_populates="profesional",
        foreign_keys="EvaluacionSalud.profesional_id",
    )
    lista_espera: Mapped[list["ListaEspera"]] = relationship(  # noqa: F821
        back_populates="alumno", foreign_keys="ListaEspera.alumno_id"
    )
    notificaciones: Mapped[list["Notificacion"]] = relationship(  # noqa: F821
        back_populates="usuario", foreign_keys="Notificacion.usuario_id"
    )

    def __repr__(self) -> str:
        return f"<Usuario {self.id}: {self.nombre} {self.apellido}>"
