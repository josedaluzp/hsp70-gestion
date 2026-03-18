import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.actividad import Actividad
from app.models.enums import EstadoInscripcion, RolUsuario
from app.models.inscripcion import Inscripcion
from app.models.turno import Turno
from app.models.usuario import Usuario
from app.schemas.turno import TurnoCreate, TurnoList, TurnoUpdate


async def list_turnos(
    db: AsyncSession,
    *,
    actividad_id: int | None = None,
    profesor_id: int | None = None,
    dia_semana: str | None = None,
    page: int = 1,
    page_size: int = 20,
    solo_activos: bool = True,
) -> TurnoList:
    query = select(Turno)
    count_query = select(func.count(Turno.id))

    if solo_activos:
        query = query.where(Turno.activo.is_(True))
        count_query = count_query.where(Turno.activo.is_(True))

    if actividad_id is not None:
        query = query.where(Turno.actividad_id == actividad_id)
        count_query = count_query.where(Turno.actividad_id == actividad_id)

    if profesor_id is not None:
        query = query.where(Turno.profesor_id == profesor_id)
        count_query = count_query.where(Turno.profesor_id == profesor_id)

    if dia_semana is not None:
        query = query.where(Turno.dia_semana == dia_semana)
        count_query = count_query.where(Turno.dia_semana == dia_semana)

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Turno.dia_semana, Turno.hora_inicio).offset(offset).limit(
        page_size
    )
    result = await db.execute(query)
    items = list(result.scalars().all())

    return TurnoList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_turno(db: AsyncSession, turno_id: int) -> dict:
    query = (
        select(Turno)
        .where(Turno.id == turno_id)
        .options(selectinload(Turno.actividad), selectinload(Turno.inscripciones))
    )
    result = await db.execute(query)
    turno = result.scalar_one_or_none()
    if turno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno not found",
        )

    inscritos = sum(
        1 for i in turno.inscripciones if i.estado == EstadoInscripcion.ACTIVA
    )
    cupo_maximo = turno.actividad.cupo_maximo
    cupo_disponible = max(0, cupo_maximo - inscritos)

    return {
        "id": turno.id,
        "actividad_id": turno.actividad_id,
        "profesor_id": turno.profesor_id,
        "dia_semana": turno.dia_semana,
        "hora_inicio": turno.hora_inicio,
        "hora_fin": turno.hora_fin,
        "sala": turno.sala,
        "activo": turno.activo,
        "inscritos": inscritos,
        "cupo_maximo": cupo_maximo,
        "cupo_disponible": cupo_disponible,
    }


async def create_turno(db: AsyncSession, data: TurnoCreate) -> Turno:
    await _validate_actividad(db, data.actividad_id)
    await _validate_profesor(db, data.profesor_id)
    await _check_overlap(
        db,
        profesor_id=data.profesor_id,
        sala=data.sala,
        dia_semana=data.dia_semana,
        hora_inicio=data.hora_inicio,
        hora_fin=data.hora_fin,
    )

    turno = Turno(**data.model_dump())
    db.add(turno)
    await db.commit()
    await db.refresh(turno)
    return turno


async def update_turno(
    db: AsyncSession, turno_id: int, data: TurnoUpdate
) -> Turno:
    turno = await _get_or_404(db, turno_id)

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return turno

    if "actividad_id" in update_data:
        await _validate_actividad(db, update_data["actividad_id"])

    if "profesor_id" in update_data:
        await _validate_profesor(db, update_data["profesor_id"])

    # Build effective values for overlap check
    profesor_id = update_data.get("profesor_id", turno.profesor_id)
    sala = update_data.get("sala", turno.sala)
    dia_semana = update_data.get("dia_semana", turno.dia_semana)
    hora_inicio = update_data.get("hora_inicio", turno.hora_inicio)
    hora_fin = update_data.get("hora_fin", turno.hora_fin)

    # Validate times when only one is updated
    if hora_fin <= hora_inicio:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="hora_fin must be after hora_inicio",
        )

    needs_overlap_check = any(
        k in update_data
        for k in ("profesor_id", "sala", "dia_semana", "hora_inicio", "hora_fin")
    )
    if needs_overlap_check:
        await _check_overlap(
            db,
            profesor_id=profesor_id,
            sala=sala,
            dia_semana=dia_semana,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            exclude_id=turno_id,
        )

    for field, value in update_data.items():
        setattr(turno, field, value)

    await db.commit()
    await db.refresh(turno)
    return turno


async def deactivate_turno(db: AsyncSession, turno_id: int) -> None:
    turno = await _get_or_404(db, turno_id)
    if not turno.activo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Turno is already inactive",
        )
    turno.activo = False
    await db.commit()


async def _get_or_404(db: AsyncSession, turno_id: int) -> Turno:
    result = await db.execute(select(Turno).where(Turno.id == turno_id))
    turno = result.scalar_one_or_none()
    if turno is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Turno not found",
        )
    return turno


async def _validate_actividad(db: AsyncSession, actividad_id: int) -> None:
    result = await db.execute(
        select(Actividad).where(Actividad.id == actividad_id)
    )
    actividad = result.scalar_one_or_none()
    if actividad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Actividad not found",
        )
    if not actividad.activa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Actividad is not active",
        )


async def _validate_profesor(db: AsyncSession, profesor_id: int) -> None:
    result = await db.execute(
        select(Usuario).where(Usuario.id == profesor_id)
    )
    usuario = result.scalar_one_or_none()
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profesor not found",
        )
    if usuario.rol != RolUsuario.PROFESOR and usuario.rol != RolUsuario.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a profesor",
        )


async def _check_overlap(
    db: AsyncSession,
    *,
    profesor_id: int,
    sala: str | None,
    dia_semana,
    hora_inicio,
    hora_fin,
    exclude_id: int | None = None,
) -> None:
    # Check professor schedule overlap
    prof_query = select(Turno).where(
        Turno.profesor_id == profesor_id,
        Turno.dia_semana == dia_semana,
        Turno.activo.is_(True),
        Turno.hora_inicio < hora_fin,
        Turno.hora_fin > hora_inicio,
    )
    if exclude_id is not None:
        prof_query = prof_query.where(Turno.id != exclude_id)

    result = await db.execute(prof_query)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Professor has a schedule conflict on this day and time",
        )

    # Check room overlap (only if sala is set)
    if sala is not None:
        room_query = select(Turno).where(
            Turno.sala == sala,
            Turno.dia_semana == dia_semana,
            Turno.activo.is_(True),
            Turno.hora_inicio < hora_fin,
            Turno.hora_fin > hora_inicio,
        )
        if exclude_id is not None:
            room_query = room_query.where(Turno.id != exclude_id)

        result = await db.execute(room_query)
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room has a schedule conflict on this day and time",
            )
