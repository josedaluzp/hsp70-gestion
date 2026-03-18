import re
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _validate_dni(v: str) -> str:
    cleaned = v.replace(".", "").replace("-", "").strip()
    if not re.match(r"^\d{7,8}$", cleaned):
        msg = "DNI must be 7 or 8 digits"
        raise ValueError(msg)
    return cleaned


class UserCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    telefono: str | None = Field(default=None, max_length=50)
    dni: str | None = Field(default=None, max_length=20)
    fecha_nacimiento: date | None = None
    rol: str = Field(default="alumno")

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_dni(v)

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_fecha_nacimiento(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            msg = "Birth date cannot be in the future"
            raise ValueError(msg)
        return v


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    email: str
    telefono: str | None
    dni: str | None
    fecha_nacimiento: date | None
    rol: str
    activo: bool
    created_at: datetime


class UserUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    apellido: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    telefono: str | None = Field(default=None, max_length=50)
    dni: str | None = Field(default=None, max_length=20)
    fecha_nacimiento: date | None = None
    rol: str | None = None
    activo: bool | None = None

    @field_validator("dni")
    @classmethod
    def validate_dni(cls, v: str | None) -> str | None:
        if v is None:
            return v
        return _validate_dni(v)

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_fecha_nacimiento(cls, v: date | None) -> date | None:
        if v is not None and v > date.today():
            msg = "Birth date cannot be in the future"
            raise ValueError(msg)
        return v


class UserList(BaseModel):
    items: list[UserRead]
    total: int
    page: int
    page_size: int
    pages: int


class ProfesorRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    email: str
