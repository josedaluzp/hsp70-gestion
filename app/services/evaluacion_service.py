from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import RolUsuario
from app.models.evaluacion_salud import EvaluacionSalud
from app.models.usuario import Usuario
from app.schemas.evaluacion_salud import EvaluacionSaludCreate


def _calcular_imc(peso_kg: float, altura_cm: float) -> float:
    altura_m = altura_cm / 100
    return round(peso_kg / (altura_m**2), 2)


async def create_evaluacion(
    db: AsyncSession,
    data: EvaluacionSaludCreate,
    profesional: Usuario,
) -> EvaluacionSalud:
    alumno = await _get_alumno_or_404(db, data.alumno_id)
    if alumno.rol != RolUsuario.ALUMNO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target user is not a student",
        )

    imc = _calcular_imc(data.peso_kg, data.altura_cm)

    evaluacion = EvaluacionSalud(
        alumno_id=data.alumno_id,
        profesional_id=profesional.id,
        peso_kg=data.peso_kg,
        altura_cm=data.altura_cm,
        imc=imc,
        grasa_corporal=data.grasa_corporal,
        objetivo=data.objetivo,
        notas=data.notas,
    )
    db.add(evaluacion)
    await db.commit()
    await db.refresh(evaluacion)
    return evaluacion


async def list_evaluaciones_alumno(
    db: AsyncSession,
    alumno_id: int,
    current_user: Usuario,
) -> list[EvaluacionSalud]:
    await _get_alumno_or_404(db, alumno_id)
    _check_read_access_for_alumno(current_user, alumno_id)

    query = (
        select(EvaluacionSalud)
        .where(EvaluacionSalud.alumno_id == alumno_id)
        .order_by(EvaluacionSalud.fecha.desc())
    )

    if current_user.rol == RolUsuario.PROFESOR:
        query = query.where(
            EvaluacionSalud.profesional_id == current_user.id
        )

    result = await db.execute(query)
    return list(result.scalars().all())


async def get_evaluacion(
    db: AsyncSession,
    evaluacion_id: int,
    current_user: Usuario,
) -> EvaluacionSalud:
    evaluacion = await _get_evaluacion_or_404(db, evaluacion_id)
    _check_read_access(current_user, evaluacion)
    return evaluacion


def _check_read_access_for_alumno(
    current_user: Usuario, alumno_id: int
) -> None:
    if current_user.rol == RolUsuario.ADMIN:
        return
    if current_user.rol == RolUsuario.PROFESOR:
        return
    if current_user.id == alumno_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this student's evaluations",
    )


def _check_read_access(
    current_user: Usuario, evaluacion: EvaluacionSalud
) -> None:
    if current_user.rol == RolUsuario.ADMIN:
        return
    if current_user.rol == RolUsuario.PROFESOR:
        if evaluacion.profesional_id == current_user.id:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this evaluation",
        )
    if current_user.id == evaluacion.alumno_id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have access to this evaluation",
    )


async def _get_alumno_or_404(
    db: AsyncSession, alumno_id: int
) -> Usuario:
    result = await db.execute(
        select(Usuario).where(Usuario.id == alumno_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )
    return user


async def _get_evaluacion_or_404(
    db: AsyncSession, evaluacion_id: int
) -> EvaluacionSalud:
    result = await db.execute(
        select(EvaluacionSalud).where(EvaluacionSalud.id == evaluacion_id)
    )
    evaluacion = result.scalar_one_or_none()
    if evaluacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found",
        )
    return evaluacion
