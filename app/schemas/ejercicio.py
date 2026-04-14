from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EjercicioCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    video_url: str = Field(min_length=1, max_length=500)


class EjercicioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    video_url: str | None = Field(default=None, min_length=1, max_length=500)


class EjercicioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    video_url: str
    created_at: datetime


class EjercicioList(BaseModel):
    items: list[EjercicioRead]
    total: int
    page: int
    page_size: int
    pages: int
