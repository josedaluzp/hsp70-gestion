import math
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.actividad import Actividad
from app.models.enums import EstadoInscripcion, EstadoPago, RolUsuario
from app.models.inscripcion import Inscripcion
from app.models.lista_espera import ListaEspera
from app.models.notificacion import Notificacion
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.turno import Turno
from app.models.usuario import Usuario
from app.schemas.inscripcion import InscripcionDetailRead, InscripcionList


async def inscribir_alumno(
    db: AsyncSession,
    *,
    alumno_id: int,
    turno_id: int,
) -> dict:
    """Enroll a student in a shift. Returns inscription or waitlist info."""
    alumno = await _get_alumno_or_404(db, alumno_id)
    turno = await _get_turno_activo_or_404(db, turno_id)

    await _check_not_already_enrolled(db, alumno_id, turno_id)
    await _check_not_on_waitlist(db, alumno_id, turno_id)

    plan = await _get_active_membership_plan(db, alumno_id)
    await _check_max_actividades(db, alumno_id, turno, plan)

    cupo_disponible = await _get_cupo_disponible(db, turno)

    if cupo_disponible > 0:
        inscripcion = Inscripcion(
            alumno_id=alumno_id,
            turno_id=turno_id,
            estado=EstadoInscripcion.ACTIVA,
        )
        db.add(inscripcion)
        await db.commit()
        await db.refresh(inscripcion)
        return _build_response(inscripcion, alumno, turno)

    # No cupo: add to waitlist
    posicion = await _next_waitlist_position(db, turno_id)
    lista_entry = ListaEspera(
        alumno_id=alumno_id,
        turno_id=turno_id,
        posicion=posicion,
    )
    db.add(lista_entry)
    await db.commit()
    await db.refresh(lista_entry)

    return {
        "lista_espera": True,
        "posicion": posicion,
        "turno_id": turno_id,
        "alumno_id": alumno_id,
        "mensaje": f"No hay cupo disponible. Agregado a lista de espera en posición {posicion}.",
    }


async def cancelar_inscripcion(
    db: AsyncSession,
    *,
    inscripcion_id: int,
    current_user: Usuario,
) -> None:
    """Cancel an enrollment. Promotes first waitlisted student if applicable."""
    inscripcion = await _get_inscripcion_or_404(db, inscripcion_id)

    _check_cancel_permission(inscripcion, current_user)

    if inscripcion.estado == EstadoInscripcion.CANCELADA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Inscription is already cancelled",
        )

    turno_id = inscripcion.turno_id
    inscripcion.estado = EstadoInscripcion.CANCELADA

    if inscripcion.estado == EstadoInscripcion.CANCELADA:
        # Promote from waitlist
        await _promote_from_waitlist(db, turno_id)

    await db.commit()


async def get_inscritos(
    db: AsyncSession,
    *,
    turno_id: int,
    page: int = 1,
    page_size: int = 20,
) -> InscripcionList:
    """List active enrollments for a shift."""
    await _get_turno_or_404(db, turno_id)

    base_filter = [
        Inscripcion.turno_id == turno_id,
        Inscripcion.estado == EstadoInscripcion.ACTIVA,
    ]
    count_query = select(func.count(Inscripcion.id)).where(*base_filter)
    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = (
        select(Inscripcion)
        .where(*base_filter)
        .options(selectinload(Inscripcion.alumno))
        .order_by(Inscripcion.fecha_inscripcion)
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    detail_items = []
    for insc in items:
        detail_items.append(
            InscripcionDetailRead(
                id=insc.id,
                alumno_id=insc.alumno_id,
                turno_id=insc.turno_id,
                estado=insc.estado,
                fecha_inscripcion=insc.fecha_inscripcion,
                nombre_alumno=f"{insc.alumno.nombre} {insc.alumno.apellido}",
            )
        )

    return InscripcionList(
        items=detail_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_inscripciones_alumno(
    db: AsyncSession,
    *,
    alumno_id: int,
    page: int = 1,
    page_size: int = 20,
    solo_activas: bool = False,
) -> InscripcionList:
    """List enrollments for a student."""
    base_filter = [Inscripcion.alumno_id == alumno_id]
    if solo_activas:
        base_filter.append(Inscripcion.estado == EstadoInscripcion.ACTIVA)

    count_query = select(func.count(Inscripcion.id)).where(*base_filter)
    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = (
        select(Inscripcion)
        .where(*base_filter)
        .options(
            selectinload(Inscripcion.turno).selectinload(Turno.actividad),
        )
        .order_by(Inscripcion.fecha_inscripcion.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    # Get waitlist positions for LISTA_ESPERA items (via ListaEspera table)
    waitlist_positions: dict[int, int] = {}
    lista_espera_alumno = await db.execute(
        select(ListaEspera).where(ListaEspera.alumno_id == alumno_id)
    )
    for entry in lista_espera_alumno.scalars().all():
        waitlist_positions[entry.turno_id] = entry.posicion

    detail_items = []
    for insc in items:
        turno = insc.turno
        detail_items.append(
            InscripcionDetailRead(
                id=insc.id,
                alumno_id=insc.alumno_id,
                turno_id=insc.turno_id,
                estado=insc.estado,
                fecha_inscripcion=insc.fecha_inscripcion,
                nombre_actividad=turno.actividad.nombre if turno and turno.actividad else None,
                dia_semana=turno.dia_semana.value if turno else None,
                hora_inicio=str(turno.hora_inicio) if turno else None,
                posicion_espera=waitlist_positions.get(insc.turno_id),
            )
        )

    return InscripcionList(
        items=detail_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


# ── Internal helpers ──────────────────────────────────────────────


async def _get_alumno_or_404(db: AsyncSession, alumno_id: int) -> Usuario:
    result = await db.execute(
        select(Usuario).where(Usuario.id == alumno_id)
    )
    alumno = result.scalar_one_or_none()
    if alumno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alumno not found",
        )
    if not alumno.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alumno account is inactive",
        )
    return alumno


async def _get_turno_activo_or_404(db: AsyncSession, turno_id: int) -> Turno:
    result = await db.execute(
        select(Turno)
        .where(Turno.id == turno_id)
        .options(selectinload(Turno.actividad))
    )
    turno = result.scalar_one_or_none()
    if turno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno not found",
        )
    if not turno.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Turno is not active",
        )
    return turno


async def _get_turno_or_404(db: AsyncSession, turno_id: int) -> Turno:
    result = await db.execute(select(Turno).where(Turno.id == turno_id))
    turno = result.scalar_one_or_none()
    if turno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno not found",
        )
    return turno


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


async def _check_not_already_enrolled(
    db: AsyncSession, alumno_id: int, turno_id: int
) -> None:
    result = await db.execute(
        select(Inscripcion).where(
            Inscripcion.alumno_id == alumno_id,
            Inscripcion.turno_id == turno_id,
            Inscripcion.estado == EstadoInscripcion.ACTIVA,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already enrolled in this shift",
        )


async def _check_not_on_waitlist(
    db: AsyncSession, alumno_id: int, turno_id: int
) -> None:
    result = await db.execute(
        select(ListaEspera).where(
            ListaEspera.alumno_id == alumno_id,
            ListaEspera.turno_id == turno_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already on the waitlist for this shift",
        )


async def _get_active_membership_plan(
    db: AsyncSession, alumno_id: int
) -> Plan:
    today = date.today()
    result = await db.execute(
        select(Pago)
        .where(
            Pago.alumno_id == alumno_id,
            Pago.estado == EstadoPago.APROBADO,
            Pago.fecha_vencimiento >= today,
        )
        .options(selectinload(Pago.plan))
        .order_by(Pago.fecha_vencimiento.desc())
        .limit(1)
    )
    pago = result.scalar_one_or_none()
    if pago is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student does not have an active membership",
        )
    return pago.plan


async def _check_max_actividades(
    db: AsyncSession,
    alumno_id: int,
    turno: Turno,
    plan: Plan,
) -> None:
    # Get distinct actividad_ids for active enrollments
    result = await db.execute(
        select(Turno.actividad_id)
        .join(Inscripcion, Inscripcion.turno_id == Turno.id)
        .where(
            Inscripcion.alumno_id == alumno_id,
            Inscripcion.estado == EstadoInscripcion.ACTIVA,
        )
        .distinct()
    )
    enrolled_actividad_ids = {row[0] for row in result.all()}

    # If the new turno's activity is already enrolled, no new activity is added
    if turno.actividad_id in enrolled_actividad_ids:
        return

    if len(enrolled_actividad_ids) >= plan.max_actividades:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum number of activities ({plan.max_actividades}) for your plan has been reached",
        )


async def _get_cupo_disponible(db: AsyncSession, turno: Turno) -> int:
    active_count = (
        await db.execute(
            select(func.count(Inscripcion.id)).where(
                Inscripcion.turno_id == turno.id,
                Inscripcion.estado == EstadoInscripcion.ACTIVA,
            )
        )
    ).scalar_one()
    cupo_maximo = turno.actividad.cupo_maximo
    return max(0, cupo_maximo - active_count)


async def _next_waitlist_position(db: AsyncSession, turno_id: int) -> int:
    result = await db.execute(
        select(func.max(ListaEspera.posicion)).where(
            ListaEspera.turno_id == turno_id
        )
    )
    max_pos = result.scalar_one()
    return (max_pos or 0) + 1


async def _promote_from_waitlist(db: AsyncSession, turno_id: int) -> None:
    """Promote the first person on the waitlist to active enrollment."""
    result = await db.execute(
        select(ListaEspera)
        .where(ListaEspera.turno_id == turno_id)
        .order_by(ListaEspera.posicion)
        .limit(1)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        return

    # Create active inscription for the promoted student
    inscripcion = Inscripcion(
        alumno_id=entry.alumno_id,
        turno_id=turno_id,
        estado=EstadoInscripcion.ACTIVA,
    )
    db.add(inscripcion)

    promoted_alumno_id = entry.alumno_id
    await db.delete(entry)

    # Recalculate positions for remaining entries
    await _recalculate_waitlist_positions(db, turno_id)

    # Notify the promoted student
    notificacion = Notificacion(
        usuario_id=promoted_alumno_id,
        tipo="inscripcion_promovida",
        mensaje="Se ha liberado un cupo y tu inscripción fue activada desde la lista de espera.",
    )
    db.add(notificacion)


async def _recalculate_waitlist_positions(
    db: AsyncSession, turno_id: int
) -> None:
    result = await db.execute(
        select(ListaEspera)
        .where(ListaEspera.turno_id == turno_id)
        .order_by(ListaEspera.posicion)
    )
    entries = list(result.scalars().all())
    for i, entry in enumerate(entries, start=1):
        entry.posicion = i


def _check_cancel_permission(
    inscripcion: Inscripcion, current_user: Usuario
) -> None:
    if current_user.rol in (RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA):
        return
    if inscripcion.alumno_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own enrollments",
        )


def _build_response(
    inscripcion: Inscripcion, alumno: Usuario, turno: Turno
) -> dict:
    return {
        "id": inscripcion.id,
        "alumno_id": inscripcion.alumno_id,
        "turno_id": inscripcion.turno_id,
        "estado": inscripcion.estado.value,
        "fecha_inscripcion": inscripcion.fecha_inscripcion.isoformat()
        if inscripcion.fecha_inscripcion
        else None,
        "lista_espera": False,
    }
