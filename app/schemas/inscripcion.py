from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EstadoInscripcion


class InscripcionCreate(BaseModel):
    alumno_id: int = Field(gt=0)
    turno_id: int = Field(gt=0)
    estado: EstadoInscripcion = EstadoInscripcion.ACTIVA


class InscripcionRequest(BaseModel):
    """Request body for POST /api/inscripciones."""

    turno_id: int = Field(gt=0)
    alumno_id: int | None = Field(default=None, gt=0)


class InscripcionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alumno_id: int
    turno_id: int
    estado: EstadoInscripcion
    fecha_inscripcion: datetime


class InscripcionDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alumno_id: int
    turno_id: int
    estado: EstadoInscripcion
    fecha_inscripcion: datetime
    nombre_alumno: str | None = None
    nombre_actividad: str | None = None
    dia_semana: str | None = None
    hora_inicio: str | None = None
    posicion_espera: int | None = None


class InscripcionList(BaseModel):
    items: list[InscripcionDetailRead]
    total: int
    page: int
    page_size: int
    pages: int
