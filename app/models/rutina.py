from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Rutina(Base):
    __tablename__ = "rutinas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200))
    descripcion: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    profesor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    profesor: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="rutinas_creadas", foreign_keys=[profesor_id]
    )
    ejercicios: Mapped[list["RutinaEjercicio"]] = relationship(
        back_populates="rutina", cascade="all, delete-orphan",
        order_by="RutinaEjercicio.orden"
    )
    asignaciones: Mapped[list["RutinaAsignacion"]] = relationship(
        back_populates="rutina", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Rutina {self.id}: {self.nombre}>"


class RutinaEjercicio(Base):
    __tablename__ = "rutina_ejercicios"
    __table_args__ = (
        UniqueConstraint("rutina_id", "ejercicio_id", name="uq_rutina_ejercicio"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    rutina_id: Mapped[int] = mapped_column(ForeignKey("rutinas.id"))
    ejercicio_id: Mapped[int] = mapped_column(ForeignKey("ejercicios.id"))
    orden: Mapped[int] = mapped_column(default=0)

    rutina: Mapped["Rutina"] = relationship(back_populates="ejercicios")
    ejercicio: Mapped["Ejercicio"] = relationship(  # noqa: F821
        back_populates="rutina_ejercicios"
    )

    def __repr__(self) -> str:
        return f"<RutinaEjercicio rutina={self.rutina_id} ejercicio={self.ejercicio_id}>"


class RutinaAsignacion(Base):
    __tablename__ = "rutina_asignaciones"
    __table_args__ = (
        UniqueConstraint("rutina_id", "alumno_id", name="uq_rutina_alumno"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    rutina_id: Mapped[int] = mapped_column(ForeignKey("rutinas.id"))
    alumno_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    fecha_asignacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    rutina: Mapped["Rutina"] = relationship(back_populates="asignaciones")
    alumno: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="rutinas_asignadas", foreign_keys=[alumno_id]
    )

    def __repr__(self) -> str:
        return f"<RutinaAsignacion rutina={self.rutina_id} alumno={self.alumno_id}>"
