import math
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asistencia import Asistencia
from app.models.enums import EstadoInscripcion, RolUsuario
from app.models.inscripcion import Inscripcion
from app.models.turno import Turno
from app.models.usuario import Usuario
from app.schemas.asistencia import AsistenciaDetailRead, AsistenciaList


async def registrar_asistencia(
    db: AsyncSession,
    *,
    inscripcion_id: int,
    fecha: date,
    presente: bool,
    observacion: str | None,
    current_user: Usuario,
) -> dict:
    """Register attendance for a student's enrollment on a given date."""
    inscripcion = await _get_inscripcion_activa_or_404(db, inscripcion_id)
    turno = await _get_turno_with_profesor(db, inscripcion.turno_id)
    _check_attendance_permission(turno, current_user)
    await _check_no_duplicate(db, inscripcion_id, fecha)

    asistencia = Asistencia(
        inscripcion_id=inscripcion_id,
        fecha=fecha,
        presente=presente,
        observacion=observacion,
    )
    db.add(asistencia)
    await db.commit()
    await db.refresh(asistencia)

    return {
        "id": asistencia.id,
        "inscripcion_id": asistencia.inscripcion_id,
        "fecha": asistencia.fecha.isoformat(),
        "presente": asistencia.presente,
        "observacion": asistencia.observacion,
    }


async def get_asistencias_turno(
    db: AsyncSession,
    *,
    turno_id: int,
    fecha: date,
    page: int = 1,
    page_size: int = 50,
) -> AsistenciaList:
    """List attendance for a shift on a specific date, with student info."""
    await _get_turno_or_404(db, turno_id)

    base_filter = [
        Inscripcion.turno_id == turno_id,
        Inscripcion.estado == EstadoInscripcion.ACTIVA,
        Asistencia.fecha == fecha,
    ]

    count_query = (
        select(func.count(Asistencia.id))
        .join(Inscripcion, Asistencia.inscripcion_id == Inscripcion.id)
        .where(*base_filter)
    )
    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = (
        select(Asistencia)
        .join(Inscripcion, Asistencia.inscripcion_id == Inscripcion.id)
        .where(*base_filter)
        .options(selectinload(Asistencia.inscripcion).selectinload(Inscripcion.alumno))
        .order_by(Asistencia.id)
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    detail_items = []
    for a in items:
        alumno = a.inscripcion.alumno
        detail_items.append(
            AsistenciaDetailRead(
                id=a.id,
                inscripcion_id=a.inscripcion_id,
                fecha=a.fecha,
                presente=a.presente,
                observacion=a.observacion,
                alumno_id=alumno.id,
                nombre_alumno=f"{alumno.nombre} {alumno.apellido}",
            )
        )

    return AsistenciaList(
        items=detail_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_asistencias_alumno(
    db: AsyncSession,
    *,
    alumno_id: int,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> AsistenciaList:
    """List attendance history for a student, with optional date filters."""
    base_filter = [Inscripcion.alumno_id == alumno_id]
    if fecha_desde:
        base_filter.append(Asistencia.fecha >= fecha_desde)
    if fecha_hasta:
        base_filter.append(Asistencia.fecha <= fecha_hasta)

    count_query = (
        select(func.count(Asistencia.id))
        .join(Inscripcion, Asistencia.inscripcion_id == Inscripcion.id)
        .where(*base_filter)
    )
    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = (
        select(Asistencia)
        .join(Inscripcion, Asistencia.inscripcion_id == Inscripcion.id)
        .where(*base_filter)
        .options(selectinload(Asistencia.inscripcion).selectinload(Inscripcion.alumno))
        .order_by(Asistencia.fecha.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    detail_items = []
    for a in items:
        alumno = a.inscripcion.alumno
        detail_items.append(
            AsistenciaDetailRead(
                id=a.id,
                inscripcion_id=a.inscripcion_id,
                fecha=a.fecha,
                presente=a.presente,
                observacion=a.observacion,
                alumno_id=alumno.id,
                nombre_alumno=f"{alumno.nombre} {alumno.apellido}",
            )
        )

    return AsistenciaList(
        items=detail_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def actualizar_asistencia(
    db: AsyncSession,
    *,
    asistencia_id: int,
    presente: bool | None,
    observacion: str | None,
    current_user: Usuario,
) -> dict:
    """Update an existing attendance record."""
    asistencia = await _get_asistencia_or_404(db, asistencia_id)
    inscripcion = await _get_inscripcion_or_404(db, asistencia.inscripcion_id)
    turno = await _get_turno_with_profesor(db, inscripcion.turno_id)
    _check_attendance_permission(turno, current_user)

    if presente is not None:
        asistencia.presente = presente
    if observacion is not None:
        asistencia.observacion = observacion

    await db.commit()
    await db.refresh(asistencia)

    return {
        "id": asistencia.id,
        "inscripcion_id": asistencia.inscripcion_id,
        "fecha": asistencia.fecha.isoformat(),
        "presente": asistencia.presente,
        "observacion": asistencia.observacion,
    }


# ── Internal helpers ──────────────────────────────────────────────


async def _get_inscripcion_activa_or_404(
    db: AsyncSession, inscripcion_id: int
) -> Inscripcion:
    result = await db.execute(
        select(Inscripcion).where(Inscripcion.id == inscripcion_id)
    )
    inscripcion = result.scalar_one_or_none()
    if inscripcion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inscription not found",
        )
    if inscripcion.estado != EstadoInscripcion.ACTIVA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inscription is not active",
        )
    return inscripcion


async def _get_inscripcion_or_404(
    db: AsyncSession, inscripcion_id: int
) -> Inscripcion:
    result = await db.execute(
        select(Inscripcion).where(Inscripcion.id == inscripcion_id)
    )
    inscripcion = result.scalar_one_or_none()
    if inscripcion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inscription not found",
        )
    return inscripcion


async def _get_turno_or_404(db: AsyncSession, turno_id: int) -> Turno:
    result = await db.execute(select(Turno).where(Turno.id == turno_id))
    turno = result.scalar_one_or_none()
    if turno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno not found",
        )
    return turno


async def _get_turno_with_profesor(db: AsyncSession, turno_id: int) -> Turno:
    result = await db.execute(
        select(Turno).where(Turno.id == turno_id)
    )
    turno = result.scalar_one_or_none()
    if turno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno not found",
        )
    return turno


async def _get_asistencia_or_404(
    db: AsyncSession, asistencia_id: int
) -> Asistencia:
    result = await db.execute(
        select(Asistencia).where(Asistencia.id == asistencia_id)
    )
    asistencia = result.scalar_one_or_none()
    if asistencia is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attendance record not found",
        )
    return asistencia


def _check_attendance_permission(turno: Turno, user: Usuario) -> None:
    """Only the shift's assigned professor, recepcionista, or admin can manage attendance."""
    if user.rol == RolUsuario.ADMIN:
        return
    if user.rol == RolUsuario.RECEPCIONISTA:
        return
    if user.rol == RolUsuario.PROFESOR and turno.profesor_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the assigned professor, receptionist, or admin can manage attendance",
    )


async def _check_no_duplicate(
    db: AsyncSession, inscripcion_id: int, fecha: date
) -> None:
    result = await db.execute(
        select(Asistencia).where(
            Asistencia.inscripcion_id == inscripcion_id,
            Asistencia.fecha == fecha,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attendance already recorded for this student on this date",
        )
