import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.actividad import Actividad
from app.schemas.actividad import ActividadCreate, ActividadList, ActividadUpdate


async def list_actividades(
    db: AsyncSession,
    *,
    nombre: str | None = None,
    page: int = 1,
    page_size: int = 20,
    solo_activas: bool = True,
) -> ActividadList:
    query = select(Actividad)
    count_query = select(func.count(Actividad.id))

    if solo_activas:
        query = query.where(Actividad.activa.is_(True))
        count_query = count_query.where(Actividad.activa.is_(True))

    if nombre:
        query = query.where(Actividad.nombre.ilike(f"%{nombre}%"))
        count_query = count_query.where(Actividad.nombre.ilike(f"%{nombre}%"))

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Actividad.nombre).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return ActividadList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_actividad(db: AsyncSession, actividad_id: int) -> Actividad:
    query = (
        select(Actividad)
        .where(Actividad.id == actividad_id)
        .options(selectinload(Actividad.turnos))
    )
    result = await db.execute(query)
    actividad = result.scalar_one_or_none()
    if actividad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )
    return actividad


async def create_actividad(
    db: AsyncSession, data: ActividadCreate
) -> Actividad:
    existing = await db.execute(
        select(Actividad).where(Actividad.nombre == data.nombre)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Activity name already exists",
        )

    actividad = Actividad(**data.model_dump())
    db.add(actividad)
    await db.commit()
    await db.refresh(actividad)
    return actividad


async def update_actividad(
    db: AsyncSession, actividad_id: int, data: ActividadUpdate
) -> Actividad:
    actividad = await _get_or_404(db, actividad_id)

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return actividad

    if "nombre" in update_data:
        existing = await db.execute(
            select(Actividad).where(
                Actividad.nombre == update_data["nombre"],
                Actividad.id != actividad_id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Activity name already exists",
            )

    for field, value in update_data.items():
        setattr(actividad, field, value)

    await db.commit()
    await db.refresh(actividad)
    return actividad


async def deactivate_actividad(db: AsyncSession, actividad_id: int) -> None:
    actividad = await _get_or_404(db, actividad_id)
    if not actividad.activa:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Activity is already inactive",
        )
    actividad.activa = False
    await db.commit()


async def _get_or_404(db: AsyncSession, actividad_id: int) -> Actividad:
    result = await db.execute(
        select(Actividad).where(Actividad.id == actividad_id)
    )
    actividad = result.scalar_one_or_none()
    if actividad is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )
    return actividad
