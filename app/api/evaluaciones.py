from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.evaluacion_salud import EvaluacionSaludCreate, EvaluacionSaludRead
from app.services import evaluacion_service

router = APIRouter(tags=["evaluaciones"])


@router.post(
    "/api/evaluaciones",
    response_model=EvaluacionSaludRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_evaluacion(
    data: EvaluacionSaludCreate,
    db: AsyncSession = Depends(get_db),
    profesional: Usuario = Depends(require_role(RolUsuario.PROFESOR)),
):
    return await evaluacion_service.create_evaluacion(db, data, profesional)


@router.get(
    "/api/alumnos/{alumno_id}/evaluaciones",
    response_model=list[EvaluacionSaludRead],
)
async def list_evaluaciones_alumno(
    alumno_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    return await evaluacion_service.list_evaluaciones_alumno(
        db, alumno_id, current_user
    )


@router.get(
    "/api/evaluaciones/{evaluacion_id}",
    response_model=EvaluacionSaludRead,
)
async def get_evaluacion(
    evaluacion_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    return await evaluacion_service.get_evaluacion(
        db, evaluacion_id, current_user
    )
