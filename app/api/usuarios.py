from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuario import ProfesorRead, UserList, UserRead, UserUpdate
from app.services import usuario_service

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


@router.get("", response_model=UserList)
async def list_usuarios(
    rol: str | None = Query(default=None, max_length=20),
    activo: bool | None = Query(default=None),
    search: str | None = Query(default=None, max_length=200),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
    ),
):
    return await usuario_service.list_usuarios(
        db, rol=rol, activo=activo, search=search, page=page, page_size=page_size
    )


@router.get("/profesores", response_model=list[ProfesorRead])
async def list_profesores(
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(get_current_active_user),
):
    return await usuario_service.list_profesores(db)


@router.get("/{usuario_id}", response_model=UserRead)
async def get_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.ADMIN, RolUsuario.RECEPCIONISTA)
    ),
):
    return await usuario_service.get_usuario(db, usuario_id)


@router.put("/{usuario_id}", response_model=UserRead)
async def update_usuario(
    usuario_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    return await usuario_service.update_usuario(
        db, usuario_id, data, current_user
    )


@router.put("/{usuario_id}/toggle-activo", response_model=UserRead)
async def toggle_activo(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await usuario_service.toggle_activo(db, usuario_id, current_user)
