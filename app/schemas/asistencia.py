from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class AsistenciaCreate(BaseModel):
    inscripcion_id: int = Field(gt=0)
    fecha: date
    presente: bool = False
    observacion: str | None = None


class AsistenciaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    inscripcion_id: int
    fecha: date
    presente: bool
    observacion: str | None
