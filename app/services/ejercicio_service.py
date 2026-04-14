import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ejercicio import Ejercicio
from app.schemas.ejercicio import EjercicioCreate, EjercicioList, EjercicioUpdate


async def list_ejercicios(
    db: AsyncSession,
    *,
    nombre: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> EjercicioList:
    query = select(Ejercicio)
    count_query = select(func.count(Ejercicio.id))

    if nombre:
        query = query.where(Ejercicio.nombre.ilike(f"%{nombre}%"))
        count_query = count_query.where(Ejercicio.nombre.ilike(f"%{nombre}%"))

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Ejercicio.nombre).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return EjercicioList(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


async def get_ejercicio(db: AsyncSession, ejercicio_id: int) -> Ejercicio:
    return await _get_or_404(db, ejercicio_id)


async def create_ejercicio(db: AsyncSession, data: EjercicioCreate) -> Ejercicio:
    existing = await db.execute(
        select(Ejercicio).where(Ejercicio.nombre == data.nombre)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An exercise with this name already exists",
        )

    ejercicio = Ejercicio(**data.model_dump())
    db.add(ejercicio)
    await db.commit()
    await db.refresh(ejercicio)
    return ejercicio


async def update_ejercicio(
    db: AsyncSession, ejercicio_id: int, data: EjercicioUpdate
) -> Ejercicio:
    ejercicio = await _get_or_404(db, ejercicio_id)
    update_data = data.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        existing = await db.execute(
            select(Ejercicio).where(
                Ejercicio.nombre == update_data["nombre"],
                Ejercicio.id != ejercicio_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An exercise with this name already exists",
            )

    for field, value in update_data.items():
        setattr(ejercicio, field, value)

    await db.commit()
    await db.refresh(ejercicio)
    return ejercicio


async def delete_ejercicio(db: AsyncSession, ejercicio_id: int) -> None:
    ejercicio = await _get_or_404(db, ejercicio_id)
    await db.delete(ejercicio)
    await db.commit()


async def _get_or_404(db: AsyncSession, ejercicio_id: int) -> Ejercicio:
    result = await db.execute(
        select(Ejercicio).where(Ejercicio.id == ejercicio_id)
    )
    ejercicio = result.scalar_one_or_none()
    if ejercicio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    return ejercicio
