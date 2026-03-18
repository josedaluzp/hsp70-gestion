from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class AsistenciaCreate(BaseModel):
    inscripcion_id: int = Field(gt=0)
    fecha: date
    presente: bool = False
    observacion: str | None = None


class AsistenciaUpdate(BaseModel):
    presente: bool | None = None
    observacion: str | None = None


class AsistenciaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inscripcion_id: int
    fecha: date
    presente: bool
    observacion: str | None


class AsistenciaDetailRead(BaseModel):
    id: int
    inscripcion_id: int
    fecha: date
    presente: bool
    observacion: str | None
    alumno_id: int | None = None
    nombre_alumno: str | None = None


class AsistenciaList(BaseModel):
    items: list[AsistenciaDetailRead]
    total: int
    page: int
    page_size: int
    pages: int
