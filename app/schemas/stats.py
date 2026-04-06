"""Dashboard statistics response schema."""

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_alumnos: int
    total_profesores: int
    total_actividades: int
    turnos_hoy: int
    inscripciones_activas: int
