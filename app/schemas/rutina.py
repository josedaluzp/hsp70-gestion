from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ejercicio import EjercicioRead


class RutinaEjercicioItem(BaseModel):
    ejercicio_id: int = Field(gt=0)
    orden: int = Field(ge=0)


class RutinaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: str | None = Field(default=None, max_length=1000)
    ejercicios: list[RutinaEjercicioItem] = Field(default_factory=list)


class RutinaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    descripcion: str | None = None
    ejercicios: list[RutinaEjercicioItem] | None = None


class RutinaEjercicioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    orden: int
    ejercicio: EjercicioRead


class RutinaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    profesor_id: int
    profesor_nombre: str | None = None
    created_at: datetime
    ejercicio_count: int = 0


class RutinaDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    profesor_id: int
    profesor_nombre: str | None = None
    created_at: datetime
    ejercicios: list[RutinaEjercicioRead]


class RutinaList(BaseModel):
    items: list[RutinaRead]
    total: int
    page: int
    page_size: int
    pages: int


class AsignacionCreate(BaseModel):
    alumno_id: int = Field(gt=0)


class AsignacionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rutina_id: int
    alumno_id: int
    fecha_asignacion: datetime
    alumno_nombre: str | None = None


class AlumnoRutinaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    profesor_nombre: str | None = None
    ejercicio_count: int = 0
    fecha_asignacion: datetime
