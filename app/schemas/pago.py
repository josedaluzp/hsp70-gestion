from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import EstadoPago, MetodoPago, TipoPago


class PagoCreate(BaseModel):
    alumno_id: int = Field(gt=0)
    plan_id: int = Field(gt=0)
    monto: float = Field(gt=0)
    fecha_vencimiento: date
    estado: EstadoPago = EstadoPago.PENDIENTE
    mp_payment_id: str | None = Field(default=None, max_length=100)
    metodo_pago: MetodoPago
    tipo_pago: TipoPago = TipoPago.UNICO
    mp_subscription_id: str | None = Field(default=None, max_length=100)

    @field_validator("fecha_vencimiento")
    @classmethod
    def validate_fecha_vencimiento(cls, v: date) -> date:
        if v < date.today():
            msg = "Due date cannot be in the past"
            raise ValueError(msg)
        return v


class PagoUpdate(BaseModel):
    estado: EstadoPago | None = None
    monto: float | None = Field(default=None, gt=0)
    fecha_vencimiento: date | None = None
    metodo_pago: MetodoPago | None = None
    mp_payment_id: str | None = Field(default=None, max_length=100)
    tipo_pago: TipoPago | None = None
    mp_subscription_id: str | None = Field(default=None, max_length=100)


class PagoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alumno_id: int
    plan_id: int
    monto: float
    fecha_pago: datetime
    fecha_vencimiento: date
    estado: EstadoPago
    mp_payment_id: str | None
    metodo_pago: MetodoPago
    tipo_pago: TipoPago
    mp_subscription_id: str | None


class PagoList(BaseModel):
    items: list[PagoRead]
    total: int
    page: int
    page_size: int
    pages: int
