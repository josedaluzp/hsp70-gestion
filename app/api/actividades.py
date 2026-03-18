from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.actividad import (
    ActividadCreate,
    ActividadList,
    ActividadRead,
    ActividadUpdate,
)
from app.schemas.turno import TurnoRead
from app.services import actividad_service

router = APIRouter(prefix="/api/actividades", tags=["actividades"])


class ActividadDetail(ActividadRead):
    """Activity with its available shifts."""

    turnos: list[TurnoRead] = []


@router.get("", response_model=ActividadList)
async def list_actividades(
    nombre: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await actividad_service.list_actividades(
        db, nombre=nombre, page=page, page_size=page_size
    )


@router.get("/{actividad_id}", response_model=ActividadDetail)
async def get_actividad(
    actividad_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await actividad_service.get_actividad(db, actividad_id)


@router.post(
    "",
    response_model=ActividadRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_actividad(
    data: ActividadCreate,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await actividad_service.create_actividad(db, data)


@router.put("/{actividad_id}", response_model=ActividadRead)
async def update_actividad(
    actividad_id: int,
    data: ActividadUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await actividad_service.update_actividad(db, actividad_id, data)


@router.delete(
    "/{actividad_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_actividad(
    actividad_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    await actividad_service.deactivate_actividad(db, actividad_id)
