import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import EstadoPago
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.usuario import Usuario
from app.schemas.pago import PagoCreate, PagoList, PagoUpdate


async def list_pagos(
    db: AsyncSession,
    *,
    alumno_id: int | None = None,
    estado: EstadoPago | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PagoList:
    query = select(Pago)
    count_query = select(func.count(Pago.id))

    if alumno_id is not None:
        query = query.where(Pago.alumno_id == alumno_id)
        count_query = count_query.where(Pago.alumno_id == alumno_id)

    if estado is not None:
        query = query.where(Pago.estado == estado)
        count_query = count_query.where(Pago.estado == estado)

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Pago.fecha_pago.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return PagoList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_pago(db: AsyncSession, pago_id: int) -> Pago:
    return await _get_or_404(db, pago_id)


async def create_pago(db: AsyncSession, data: PagoCreate) -> Pago:
    await _validate_alumno_exists(db, data.alumno_id)
    await _validate_plan_exists(db, data.plan_id)

    pago = Pago(**data.model_dump())
    db.add(pago)
    await db.commit()
    await db.refresh(pago)
    return pago


async def update_pago(
    db: AsyncSession, pago_id: int, data: PagoUpdate
) -> Pago:
    pago = await _get_or_404(db, pago_id)

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return pago

    for field, value in update_data.items():
        setattr(pago, field, value)

    await db.commit()
    await db.refresh(pago)
    return pago


async def _get_or_404(db: AsyncSession, pago_id: int) -> Pago:
    result = await db.execute(select(Pago).where(Pago.id == pago_id))
    pago = result.scalar_one_or_none()
    if pago is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )
    return pago


async def _validate_alumno_exists(db: AsyncSession, alumno_id: int) -> None:
    result = await db.execute(
        select(Usuario.id).where(Usuario.id == alumno_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )


async def _validate_plan_exists(db: AsyncSession, plan_id: int) -> None:
    result = await db.execute(
        select(Plan.id).where(Plan.id == plan_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )
