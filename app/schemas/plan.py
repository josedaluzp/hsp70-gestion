from pydantic import BaseModel, ConfigDict, Field


class PlanCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = None
    precio: float = Field(gt=0)
    precio_suscripcion: float | None = Field(default=None, gt=0)
    duracion_dias: int = Field(gt=0)
    max_actividades: int = Field(gt=0)


class PlanUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    descripcion: str | None = None
    precio: float | None = Field(default=None, gt=0)
    precio_suscripcion: float | None = Field(default=None, gt=0)
    duracion_dias: int | None = Field(default=None, gt=0)
    max_actividades: int | None = Field(default=None, gt=0)


class PlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    precio: float
    precio_suscripcion: float | None
    duracion_dias: int
    max_actividades: int


class PlanList(BaseModel):
    items: list[PlanRead]
    total: int
    page: int
    page_size: int
    pages: int
