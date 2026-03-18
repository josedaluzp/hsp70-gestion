from pydantic import BaseModel, ConfigDict, Field


class ActividadCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = None
    cupo_maximo: int = Field(gt=0)
    duracion_min: int = Field(gt=0, le=480)
    activa: bool = True


class ActividadUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    descripcion: str | None = None
    cupo_maximo: int | None = Field(default=None, gt=0)
    duracion_min: int | None = Field(default=None, gt=0, le=480)
    activa: bool | None = None


class ActividadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    cupo_maximo: int
    duracion_min: int
    activa: bool


class ActividadList(BaseModel):
    items: list[ActividadRead]
    total: int
    page: int
    page_size: int
    pages: int
