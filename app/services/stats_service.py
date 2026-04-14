"""Service layer for admin dashboard statistics."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.actividad import Actividad
from app.models.enums import (
    DiaSemana,
    EstadoInscripcion,
    RolUsuario,
)
from app.models.inscripcion import Inscripcion
from app.models.turno import Turno
from app.models.usuario import Usuario
from app.schemas.stats import DashboardStats

WEEKDAY_MAP = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}


async def _count_users_by_role(
    db: AsyncSession, role: RolUsuario
) -> int:
    result = await db.execute(
        select(func.count(Usuario.id)).where(
            Usuario.rol == role, Usuario.activo.is_(True)
        )
    )
    return result.scalar_one()


async def _count_actividades(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(Actividad.id)).where(Actividad.activa.is_(True))
    )
    return result.scalar_one()


async def _count_turnos_hoy(db: AsyncSession) -> int:
    today_dia = WEEKDAY_MAP[date.today().weekday()]
    result = await db.execute(
        select(func.count(Turno.id)).where(
            Turno.dia_semana == today_dia, Turno.activo.is_(True)
        )
    )
    return result.scalar_one()


async def _count_inscripciones_activas(db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(Inscripcion.id)).where(
            Inscripcion.estado == EstadoInscripcion.ACTIVA
        )
    )
    return result.scalar_one()


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    """Gather all dashboard statistics in a single call."""
    return DashboardStats(
        total_alumnos=await _count_users_by_role(db, RolUsuario.ALUMNO),
        total_profesores=await _count_users_by_role(db, RolUsuario.PROFESOR),
        total_actividades=await _count_actividades(db),
        turnos_hoy=await _count_turnos_hoy(db),
        inscripciones_activas=await _count_inscripciones_activas(db),
    )
