from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import EstadoPago, MetodoPago


class Pago(Base):
    __tablename__ = "pagos"

    id: Mapped[int] = mapped_column(primary_key=True)
    alumno_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    plan_id: Mapped[int] = mapped_column(ForeignKey("planes.id"))
    monto: Mapped[float] = mapped_column(Numeric(10, 2))
    fecha_pago: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    fecha_vencimiento: Mapped[date] = mapped_column(Date)
    estado: Mapped[EstadoPago] = mapped_column(default=EstadoPago.PENDIENTE)
    mp_payment_id: Mapped[str | None] = mapped_column(String(100))
    metodo_pago: Mapped[MetodoPago]

    # Relationships
    alumno: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="pagos", foreign_keys=[alumno_id]
    )
    plan: Mapped["Plan"] = relationship(  # noqa: F821
        back_populates="pagos"
    )

    def __repr__(self) -> str:
        return f"<Pago {self.id}: {self.monto} estado={self.estado.value}>"
