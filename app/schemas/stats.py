"""Dashboard statistics response schema."""

from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_alumnos: int
    alumnos_activos: int
    total_profesores: int
    total_actividades: int
    turnos_hoy: int
    pagos_pendientes: int
    pagos_vencidos: int
    ingresos_mes: float
    inscripciones_activas: int
