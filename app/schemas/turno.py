from datetime import time

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import DiaSemana


class TurnoCreate(BaseModel):
    actividad_id: int = Field(gt=0)
    profesor_id: int = Field(gt=0)
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    sala: str | None = Field(default=None, max_length=50)
    activo: bool = True

    @model_validator(mode="after")
    def validate_hora_fin_after_inicio(self) -> "TurnoCreate":
        if self.hora_fin <= self.hora_inicio:
            msg = "hora_fin must be after hora_inicio"
            raise ValueError(msg)
        return self


class TurnoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actividad_id: int
    profesor_id: int
    dia_semana: DiaSemana
    hora_inicio: time
    hora_fin: time
    sala: str | None
    activo: bool
