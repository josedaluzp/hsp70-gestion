from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.usuario import Usuario
from app.schemas.notificacion import NotificacionList, NotificacionRead
from app.services import notificacion_service

router = APIRouter(prefix="/api/notificaciones", tags=["notificaciones"])


@router.get("", response_model=NotificacionList)
async def list_notificaciones(
    solo_no_leidas: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_active_user),
):
    return await notificacion_service.list_notificaciones(
        db,
        usuario_id=user.id,
        solo_no_leidas=solo_no_leidas,
        page=page,
        page_size=page_size,
    )


@router.put("/{notificacion_id}/leer", response_model=NotificacionRead)
async def mark_as_read(
    notificacion_id: int,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_active_user),
):
    return await notificacion_service.mark_as_read(db, notificacion_id, user.id)


@router.put("/leer-todas")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_active_user),
):
    count = await notificacion_service.mark_all_as_read(db, user.id)
    return {"marked": count}
