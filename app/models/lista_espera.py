from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ListaEspera(Base):
    __tablename__ = "lista_espera"
    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "turno_id", name="uq_espera_alumno_turno"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    turno_id: Mapped[int] = mapped_column(ForeignKey("turnos.id"))
    posicion: Mapped[int] = mapped_column(Integer)
    fecha: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    # Relationships
    alumno: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="lista_espera", foreign_keys=[alumno_id]
    )
    turno: Mapped["Turno"] = relationship(  # noqa: F821
        back_populates="lista_espera"
    )

    def __repr__(self) -> str:
        return f"<ListaEspera {self.id}: pos={self.posicion}>"
