from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ListaEsperaCreate(BaseModel):
    alumno_id: int = Field(gt=0)
    turno_id: int = Field(gt=0)
    posicion: int = Field(gt=0)


class ListaEsperaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    alumno_id: int
    turno_id: int
    posicion: int
    fecha: datetime
