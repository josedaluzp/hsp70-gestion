from pydantic import BaseModel, ConfigDict, Field


class ActividadCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = None
    cupo_maximo: int = Field(gt=0)
    duracion_min: int = Field(gt=0, le=480)
    activa: bool = True


class ActividadRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    cupo_maximo: int
    duracion_min: int
    activa: bool
