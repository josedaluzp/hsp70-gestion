from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.asistencia import (
    AsistenciaCreate,
    AsistenciaList,
    AsistenciaUpdate,
)
from app.services import asistencia_service

router = APIRouter(tags=["asistencias"])


@router.post("/api/asistencias", status_code=status.HTTP_201_CREATED)
async def registrar_asistencia(
    data: AsistenciaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Register attendance for a student.

    Only the shift's assigned professor, receptionist, or admin can record attendance.
    """
    return await asistencia_service.registrar_asistencia(
        db,
        inscripcion_id=data.inscripcion_id,
        fecha=data.fecha,
        presente=data.presente,
        observacion=data.observacion,
        current_user=current_user,
    )


@router.get(
    "/api/turnos/{turno_id}/asistencias",
    response_model=AsistenciaList,
)
async def listar_asistencias_turno(
    turno_id: int,
    fecha: date = Query(..., description="Date in YYYY-MM-DD format"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(
        require_role(RolUsuario.PROFESOR, RolUsuario.RECEPCIONISTA)
    ),
):
    """List attendance for a shift on a specific date.

    Accessible by professors, receptionists, and admins.
    """
    return await asistencia_service.get_asistencias_turno(
        db, turno_id=turno_id, fecha=fecha, page=page, page_size=page_size
    )


@router.get(
    "/api/alumnos/{alumno_id}/asistencias",
    response_model=AsistenciaList,
)
async def listar_asistencias_alumno(
    alumno_id: int,
    fecha_desde: date | None = Query(default=None),
    fecha_hasta: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """List attendance history for a student. Own data or admin/recepcionista/profesor."""
    if alumno_id != current_user.id and current_user.rol not in (
        RolUsuario.ADMIN,
        RolUsuario.RECEPCIONISTA,
        RolUsuario.PROFESOR,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own attendance history",
        )

    return await asistencia_service.get_asistencias_alumno(
        db,
        alumno_id=alumno_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        page=page,
        page_size=page_size,
    )


@router.put("/api/asistencias/{asistencia_id}")
async def actualizar_asistencia(
    asistencia_id: int,
    data: AsistenciaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """Update an attendance record.

    Only the shift's assigned professor, receptionist, or admin can update.
    """
    return await asistencia_service.actualizar_asistencia(
        db,
        asistencia_id=asistencia_id,
        presente=data.presente,
        observacion=data.observacion,
        current_user=current_user,
    )
