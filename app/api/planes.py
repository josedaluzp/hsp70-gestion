from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.plan import PlanCreate, PlanList, PlanRead, PlanUpdate
from app.services import plan_service

router = APIRouter(prefix="/api/planes", tags=["planes"])


@router.get("", response_model=PlanList)
async def list_planes(
    nombre: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    return await plan_service.list_planes(
        db, nombre=nombre, page=page, page_size=page_size
    )


@router.get("/{plan_id}", response_model=PlanRead)
async def get_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
):
    return await plan_service.get_plan(db, plan_id)


@router.post(
    "",
    response_model=PlanRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await plan_service.create_plan(db, data)


@router.put("/{plan_id}", response_model=PlanRead)
async def update_plan(
    plan_id: int,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await plan_service.update_plan(db, plan_id, data)


@router.delete(
    "/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    await plan_service.delete_plan(db, plan_id)
