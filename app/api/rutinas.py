from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.rutina import (
    AlumnoRutinaRead,
    AsignacionCreate,
    AsignacionRead,
    RutinaCreate,
    RutinaDetailRead,
    RutinaList,
    RutinaUpdate,
)
from app.services import rutina_service

router = APIRouter(tags=["rutinas"])


@router.get("/api/rutinas", response_model=RutinaList)
async def list_rutinas(
    nombre: str | None = Query(default=None),
    profesor_id: int | None = Query(default=None, gt=0),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await rutina_service.list_rutinas(
        db, nombre=nombre, profesor_id=profesor_id, page=page, page_size=page_size
    )


@router.get("/api/rutinas/{rutina_id}", response_model=RutinaDetailRead)
async def get_rutina(
    rutina_id: int,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await rutina_service.get_rutina(db, rutina_id)


@router.post(
    "/api/rutinas",
    response_model=RutinaDetailRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_rutina(
    data: RutinaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await rutina_service.create_rutina(db, data, profesor_id=current_user.id)


@router.put("/api/rutinas/{rutina_id}", response_model=RutinaDetailRead)
async def update_rutina(
    rutina_id: int,
    data: RutinaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await rutina_service.update_rutina(db, rutina_id, data, current_user)


@router.delete(
    "/api/rutinas/{rutina_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_rutina(
    rutina_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    await rutina_service.delete_rutina(db, rutina_id, current_user)


@router.post(
    "/api/rutinas/{rutina_id}/asignar",
    response_model=AsignacionRead,
    status_code=status.HTTP_201_CREATED,
)
async def asignar_rutina(
    rutina_id: int,
    data: AsignacionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await rutina_service.asignar_rutina(db, rutina_id, data, current_user)


@router.delete(
    "/api/rutinas/{rutina_id}/asignar/{alumno_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def desasignar_rutina(
    rutina_id: int,
    alumno_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    await rutina_service.desasignar_rutina(db, rutina_id, alumno_id, current_user)


@router.get(
    "/api/rutinas/{rutina_id}/asignaciones",
    response_model=list[AsignacionRead],
)
async def list_asignaciones(
    rutina_id: int,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR)
    ),
):
    return await rutina_service.list_asignaciones(db, rutina_id)


@router.get(
    "/api/alumnos/{alumno_id}/rutinas",
    response_model=list[AlumnoRutinaRead],
)
async def get_rutinas_alumno(
    alumno_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if alumno_id != current_user.id and current_user.rol not in (
        RolUsuario.ADMIN,
        RolUsuario.PROFESOR,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own routines",
        )
    return await rutina_service.get_rutinas_alumno(db, alumno_id)


@router.get(
    "/api/alumnos/{alumno_id}/rutinas/{rutina_id}",
    response_model=RutinaDetailRead,
)
async def get_rutina_alumno(
    alumno_id: int,
    rutina_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    if alumno_id != current_user.id and current_user.rol not in (
        RolUsuario.ADMIN,
        RolUsuario.PROFESOR,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own routines",
        )
    return await rutina_service.get_rutina_alumno(db, alumno_id, rutina_id)
