from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class NotificacionCreate(BaseModel):
    usuario_id: int = Field(gt=0)
    tipo: str = Field(min_length=1, max_length=50)
    mensaje: str = Field(min_length=1)
    leida: bool = False


class NotificacionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    tipo: str
    mensaje: str
    leida: bool
    fecha: datetime


class NotificacionList(BaseModel):
    items: list[NotificacionRead]
    total: int
    total_no_leidas: int
    page: int
    page_size: int
    pages: int
