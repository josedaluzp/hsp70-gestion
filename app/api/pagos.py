from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.enums import EstadoPago, RolUsuario
from app.models.usuario import Usuario
from app.schemas.pago import PagoCreate, PagoList, PagoRead, PagoUpdate
from app.services import pago_service

router = APIRouter(tags=["pagos"])


@router.get("/api/pagos", response_model=PagoList)
async def list_pagos(
    alumno_id: int | None = Query(default=None, gt=0),
    estado: EstadoPago | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.RECEPCIONISTA, RolUsuario.PROFESOR)
    ),
):
    return await pago_service.list_pagos(
        db, alumno_id=alumno_id, estado=estado, page=page, page_size=page_size
    )


@router.get("/api/alumnos/{alumno_id}/pagos", response_model=PagoList)
async def listar_pagos_alumno(
    alumno_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """List payments for a student. Own or recepcionista/admin."""
    if alumno_id != current_user.id and current_user.rol not in (
        RolUsuario.ADMIN,
        RolUsuario.RECEPCIONISTA,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own payments",
        )

    return await pago_service.list_pagos(
        db, alumno_id=alumno_id, page=page, page_size=page_size
    )


@router.get("/api/pagos/{pago_id}", response_model=PagoRead)
async def get_pago(
    pago_id: int,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.RECEPCIONISTA, RolUsuario.PROFESOR)
    ),
):
    return await pago_service.get_pago(db, pago_id)


@router.post(
    "/api/pagos",
    response_model=PagoRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_pago(
    data: PagoCreate,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.RECEPCIONISTA)
    ),
):
    return await pago_service.create_pago(db, data)


@router.patch("/api/pagos/{pago_id}", response_model=PagoRead)
async def update_pago(
    pago_id: int,
    data: PagoUpdate,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.RECEPCIONISTA)
    ),
):
    return await pago_service.update_pago(db, pago_id, data)
