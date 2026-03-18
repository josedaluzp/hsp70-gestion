from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.enums import DiaSemana, RolUsuario
from app.models.usuario import Usuario
from app.schemas.turno import TurnoCreate, TurnoDetail, TurnoList, TurnoRead, TurnoUpdate
from app.services import turno_service

router = APIRouter(prefix="/api/turnos", tags=["turnos"])


@router.get("", response_model=TurnoList)
async def list_turnos(
    actividad_id: int | None = Query(default=None, gt=0),
    profesor_id: int | None = Query(default=None, gt=0),
    dia_semana: DiaSemana | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await turno_service.list_turnos(
        db,
        actividad_id=actividad_id,
        profesor_id=profesor_id,
        dia_semana=dia_semana,
        page=page,
        page_size=page_size,
    )


@router.get("/{turno_id}", response_model=TurnoDetail)
async def get_turno(
    turno_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await turno_service.get_turno(db, turno_id)


@router.post(
    "",
    response_model=TurnoRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_turno(
    data: TurnoCreate,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await turno_service.create_turno(db, data)


@router.put("/{turno_id}", response_model=TurnoRead)
async def update_turno(
    turno_id: int,
    data: TurnoUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await turno_service.update_turno(db, turno_id, data)


@router.delete(
    "/{turno_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_turno(
    turno_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    await turno_service.deactivate_turno(db, turno_id)
