from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoInscripcion


class InscripcionCreate(BaseModel):
    alumno_id: int = Field(gt=0)
    turno_id: int = Field(gt=0)
    estado: EstadoInscripcion = EstadoInscripcion.ACTIVA


class InscripcionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alumno_id: int
    turno_id: int
    estado: EstadoInscripcion
    fecha_inscripcion: datetime
