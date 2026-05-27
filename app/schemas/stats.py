"""Dashboard statistics response schema."""

from pydantic import BaseModel


class AttendanceDay(BaseModel):
    fecha: str        # "Lun", "Mar", etc.
    presentes: int
    ausentes: int


class DashboardStats(BaseModel):
    total_alumnos: int
    total_profesores: int
    total_actividades: int
    turnos_hoy: int
    inscripciones_activas: int
    asistencia_semanal: list[AttendanceDay] = []
