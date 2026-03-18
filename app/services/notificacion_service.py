import math

from fastapi import HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notificacion import Notificacion
from app.schemas.notificacion import NotificacionCreate, NotificacionList


async def list_notificaciones(
    db: AsyncSession,
    *,
    usuario_id: int,
    solo_no_leidas: bool = False,
    page: int = 1,
    page_size: int = 20,
) -> NotificacionList:
    base = select(Notificacion).where(Notificacion.usuario_id == usuario_id)
    count_base = select(func.count(Notificacion.id)).where(
        Notificacion.usuario_id == usuario_id
    )

    query = base
    count_query = count_base

    if solo_no_leidas:
        query = query.where(Notificacion.leida.is_(False))
        count_query = count_query.where(Notificacion.leida.is_(False))

    total = (await db.execute(count_query)).scalar_one()
    total_no_leidas = (
        await db.execute(
            select(func.count(Notificacion.id)).where(
                Notificacion.usuario_id == usuario_id,
                Notificacion.leida.is_(False),
            )
        )
    ).scalar_one()

    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Notificacion.fecha.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return NotificacionList(
        items=items,
        total=total,
        total_no_leidas=total_no_leidas,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def create_notificacion(
    db: AsyncSession, data: NotificacionCreate
) -> Notificacion:
    notificacion = Notificacion(**data.model_dump())
    db.add(notificacion)
    await db.commit()
    await db.refresh(notificacion)
    return notificacion


async def mark_as_read(
    db: AsyncSession, notificacion_id: int, usuario_id: int
) -> Notificacion:
    result = await db.execute(
        select(Notificacion).where(
            Notificacion.id == notificacion_id,
            Notificacion.usuario_id == usuario_id,
        )
    )
    notificacion = result.scalar_one_or_none()
    if notificacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    notificacion.leida = True
    await db.commit()
    await db.refresh(notificacion)
    return notificacion


async def mark_all_as_read(db: AsyncSession, usuario_id: int) -> int:
    result = await db.execute(
        update(Notificacion)
        .where(
            Notificacion.usuario_id == usuario_id,
            Notificacion.leida.is_(False),
        )
        .values(leida=True)
    )
    await db.commit()
    return result.rowcount
