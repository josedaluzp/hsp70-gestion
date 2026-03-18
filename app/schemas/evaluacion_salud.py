from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EvaluacionSaludCreate(BaseModel):
    alumno_id: int = Field(gt=0)
    peso_kg: float = Field(ge=20, le=300)
    altura_cm: float = Field(ge=50, le=250)
    grasa_corporal: float | None = Field(default=None, ge=0, le=100)
    objetivo: str | None = None
    notas: str | None = None


class EvaluacionSaludRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alumno_id: int
    profesional_id: int
    fecha: datetime
    peso_kg: float | None
    altura_cm: float | None
    imc: float | None
    grasa_corporal: float | None
    objetivo: str | None
    notas: str | None
