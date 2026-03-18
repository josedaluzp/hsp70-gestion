from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.inscripcion import InscripcionList, InscripcionRequest
from app.services import inscripcion_service

router = APIRouter(tags=["inscripciones"])


@router.post(
    "/api/inscripciones", status_code=status.HTTP_201_CREATED
)
async def crear_inscripcion(
    data: InscripcionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Enroll a student in a shift.

    Students can only enroll themselves. Admin/recepcionista can enroll
    any student by specifying alumno_id.
    """
    alumno_id = data.alumno_id or current_user.id

    if alumno_id != current_user.id and current_user.rol not in (
        RolUsuario.ADMIN,
        RolUsuario.RECEPCIONISTA,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only enroll yourself",
        )

    return await inscripcion_service.inscribir_alumno(
        db, alumno_id=alumno_id, turno_id=data.turno_id
    )


@router.delete(
    "/api/inscripciones/{inscripcion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def cancelar_inscripcion(
    inscripcion_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Cancel an enrollment. Own student or recepcionista/admin only."""
    await inscripcion_service.cancelar_inscripcion(
        db, inscripcion_id=inscripcion_id, current_user=current_user
    )


@router.get(
    "/api/turnos/{turno_id}/inscritos",
    response_model=InscripcionList,
)
async def listar_inscritos(
    turno_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR, RolUsuario.RECEPCIONISTA)
    ),
):
    """List enrolled students for a shift. Profesor/recepcionista/admin."""
    return await inscripcion_service.get_inscritos(
        db, turno_id=turno_id, page=page, page_size=page_size
    )


@router.get(
    "/api/alumnos/{alumno_id}/inscripciones",
    response_model=InscripcionList,
)
async def listar_inscripciones_alumno(
    alumno_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    solo_activas: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """List enrollments for a student. Own or recepcionista/admin."""
    if alumno_id != current_user.id and current_user.rol not in (
        RolUsuario.ADMIN,
        RolUsuario.RECEPCIONISTA,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own enrollments",
        )

    return await inscripcion_service.get_inscripciones_alumno(
        db,
        alumno_id=alumno_id,
        page=page,
        page_size=page_size,
        solo_activas=solo_activas,
    )
