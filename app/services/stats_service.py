"""Service layer for admin dashboard statistics."""

from datetime import date, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.actividad import Actividad
from app.models.asistencia import Asistencia
from app.models.enums import (
    DiaSemana,
    EstadoInscripcion,
    RolUsuario,
)
from app.models.inscripcion import Inscripcion
from app.models.turno import Turno
from app.models.usuario import Usuario
from app.schemas.stats import AttendanceDay, DashboardStats

WEEKDAY_MAP = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}

DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


SYSTEM_ADMIN_EMAIL = "admin@hsp70.com"


async def _count_users_by_role(db: AsyncSession, role: RolUsuario) -> int:
    result = await db.execute(
        select(func.count(Usuario.id)).where(
            Usuario.rol == role, Usuario.activo.is_(True)
        )
    )
    return result.scalar_one()


async def _count_profesionales(db: AsyncSession) -> int:
    """Count all active professional staff: directors (non-system admins) + professors."""
    result = await db.execute(
        select(func.count(Usuario.id)).where(
            Usuario.rol.in_([RolUsuario.ADMIN, RolUsuario.PROFESOR]),
            Usuario.activo.is_(True),
            Usuario.email != SYSTEM_ADMIN_EMAIL,
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


async def _get_asistencia_semanal(db: AsyncSession) -> list[AttendanceDay]:
    """Return attendance counts for the last 7 days."""
    today = date.today()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]

    result = await db.execute(
        select(
            Asistencia.fecha,
            func.sum(case((Asistencia.presente == True, 1), else_=0)).label("presentes"),  # noqa: E712
            func.count(Asistencia.id).label("total"),
        )
        .where(Asistencia.fecha.in_(days))
        .group_by(Asistencia.fecha)
        .order_by(Asistencia.fecha)
    )
    rows = {row.fecha: row for row in result.fetchall()}

    attendance = []
    for d in days:
        row = rows.get(d)
        presentes = int(row.presentes or 0) if row else 0
        total = int(row.total or 0) if row else 0
        attendance.append(
            AttendanceDay(
                fecha=DAY_LABELS[d.weekday()],
                presentes=presentes,
                ausentes=total - presentes,
            )
        )
    return attendance


async def get_dashboard_stats(db: AsyncSession) -> DashboardStats:
    """Gather all dashboard statistics in a single call."""
    return DashboardStats(
        total_alumnos=await _count_users_by_role(db, RolUsuario.ALUMNO),
        total_profesores=await _count_profesionales(db),
        total_actividades=await _count_actividades(db),
        turnos_hoy=await _count_turnos_hoy(db),
        inscripciones_activas=await _count_inscripciones_activas(db),
        asistencia_semanal=await _get_asistencia_semanal(db),
    )
