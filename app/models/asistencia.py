from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Asistencia(Base):
    __tablename__ = "asistencias"
    __table_args__ = (
        UniqueConstraint("inscripcion_id", "fecha", name="uq_asistencia_inscripcion_fecha"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    inscripcion_id: Mapped[int] = mapped_column(ForeignKey("inscripciones.id"))
    fecha: Mapped[date] = mapped_column(Date)
    presente: Mapped[bool] = mapped_column(Boolean, default=False)
    observacion: Mapped[str | None] = mapped_column(Text)

    # Relationships
    inscripcion: Mapped["Inscripcion"] = relationship(  # noqa: F821
        back_populates="asistencias"
    )

    def __repr__(self) -> str:
        return f"<Asistencia {self.id}: fecha={self.fecha} presente={self.presente}>"
