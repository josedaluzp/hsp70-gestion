import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanList, PlanUpdate


async def list_planes(
    db: AsyncSession,
    *,
    nombre: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PlanList:
    query = select(Plan)
    count_query = select(func.count(Plan.id))

    if nombre:
        query = query.where(Plan.nombre.ilike(f"%{nombre}%"))
        count_query = count_query.where(Plan.nombre.ilike(f"%{nombre}%"))

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Plan.nombre).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return PlanList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_plan(db: AsyncSession, plan_id: int) -> Plan:
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )
    return plan


async def create_plan(db: AsyncSession, data: PlanCreate) -> Plan:
    existing = await db.execute(
        select(Plan).where(Plan.nombre == data.nombre)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Plan name already exists",
        )

    plan = Plan(**data.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def update_plan(
    db: AsyncSession, plan_id: int, data: PlanUpdate
) -> Plan:
    plan = await get_plan(db, plan_id)

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return plan

    if "nombre" in update_data:
        existing = await db.execute(
            select(Plan).where(
                Plan.nombre == update_data["nombre"],
                Plan.id != plan_id,
            )
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Plan name already exists",
            )

    for field, value in update_data.items():
        setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)
    return plan


async def delete_plan(db: AsyncSession, plan_id: int) -> None:
    plan = await get_plan(db, plan_id)
    await db.delete(plan)
    await db.commit()
