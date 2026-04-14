from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.ejercicio import EjercicioCreate, EjercicioList, EjercicioRead, EjercicioUpdate
from app.services import ejercicio_service

router = APIRouter(tags=["ejercicios"])


@router.get("/api/ejercicios", response_model=EjercicioList)
async def list_ejercicios(
    nombre: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await ejercicio_service.list_ejercicios(
        db, nombre=nombre, page=page, page_size=page_size
    )


@router.get("/api/ejercicios/{ejercicio_id}", response_model=EjercicioRead)
async def get_ejercicio(
    ejercicio_id: int,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await ejercicio_service.get_ejercicio(db, ejercicio_id)


@router.post(
    "/api/ejercicios",
    response_model=EjercicioRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_ejercicio(
    data: EjercicioCreate,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await ejercicio_service.create_ejercicio(db, data)


@router.put("/api/ejercicios/{ejercicio_id}", response_model=EjercicioRead)
async def update_ejercicio(
    ejercicio_id: int,
    data: EjercicioUpdate,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await ejercicio_service.update_ejercicio(db, ejercicio_id, data)


@router.delete(
    "/api/ejercicios/{ejercicio_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_ejercicio(
    ejercicio_id: int,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    await ejercicio_service.delete_ejercicio(db, ejercicio_id)
