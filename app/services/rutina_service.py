import math

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.ejercicio import Ejercicio
from app.models.enums import RolUsuario
from app.models.rutina import Rutina, RutinaAsignacion, RutinaEjercicio
from app.models.usuario import Usuario
from app.schemas.rutina import (
    AlumnoRutinaRead,
    AsignacionCreate,
    AsignacionRead,
    RutinaCreate,
    RutinaDetailRead,
    RutinaEjercicioRead,
    RutinaList,
    RutinaRead,
    RutinaUpdate,
)


async def list_rutinas(
    db: AsyncSession,
    *,
    nombre: str | None = None,
    profesor_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> RutinaList:
    query = select(Rutina).options(
        selectinload(Rutina.profesor),
        selectinload(Rutina.ejercicios),
    )
    count_query = select(func.count(Rutina.id))

    if nombre:
        query = query.where(Rutina.nombre.ilike(f"%{nombre}%"))
        count_query = count_query.where(Rutina.nombre.ilike(f"%{nombre}%"))

    if profesor_id is not None:
        query = query.where(Rutina.profesor_id == profesor_id)
        count_query = count_query.where(Rutina.profesor_id == profesor_id)

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Rutina.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    read_items = [
        RutinaRead(
            id=r.id,
            nombre=r.nombre,
            descripcion=r.descripcion,
            profesor_id=r.profesor_id,
            profesor_nombre=f"{r.profesor.nombre} {r.profesor.apellido}",
            created_at=r.created_at,
            ejercicio_count=len(r.ejercicios),
        )
        for r in items
    ]

    return RutinaList(
        items=read_items, total=total, page=page, page_size=page_size, pages=pages
    )


async def get_rutina(db: AsyncSession, rutina_id: int) -> RutinaDetailRead:
    rutina = await _get_with_relations(db, rutina_id)

    ejercicios_read = [
        RutinaEjercicioRead(
            id=re.id,
            orden=re.orden,
            ejercicio=re.ejercicio,
        )
        for re in rutina.ejercicios
    ]

    return RutinaDetailRead(
        id=rutina.id,
        nombre=rutina.nombre,
        descripcion=rutina.descripcion,
        profesor_id=rutina.profesor_id,
        profesor_nombre=f"{rutina.profesor.nombre} {rutina.profesor.apellido}",
        created_at=rutina.created_at,
        ejercicios=ejercicios_read,
    )


async def create_rutina(
    db: AsyncSession, data: RutinaCreate, profesor_id: int
) -> RutinaDetailRead:
    if data.ejercicios:
        ejercicio_ids = [e.ejercicio_id for e in data.ejercicios]
        result = await db.execute(
            select(func.count(Ejercicio.id)).where(Ejercicio.id.in_(ejercicio_ids))
        )
        if result.scalar_one() != len(set(ejercicio_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more exercise IDs are invalid",
            )

    rutina = Rutina(
        nombre=data.nombre,
        descripcion=data.descripcion,
        profesor_id=profesor_id,
    )
    db.add(rutina)
    await db.flush()

    for item in data.ejercicios:
        re = RutinaEjercicio(
            rutina_id=rutina.id,
            ejercicio_id=item.ejercicio_id,
            orden=item.orden,
        )
        db.add(re)

    await db.commit()
    return await get_rutina(db, rutina.id)


async def update_rutina(
    db: AsyncSession, rutina_id: int, data: RutinaUpdate, current_user: Usuario
) -> RutinaDetailRead:
    rutina = await _get_or_404(db, rutina_id)
    _check_ownership(rutina, current_user)

    update_data = data.model_dump(exclude_unset=True)

    if "nombre" in update_data and update_data["nombre"] is not None:
        rutina.nombre = update_data["nombre"]
    if "descripcion" in update_data:
        rutina.descripcion = update_data["descripcion"]

    if "ejercicios" in update_data and update_data["ejercicios"] is not None:
        ejercicio_ids = [e["ejercicio_id"] for e in update_data["ejercicios"]]
        if ejercicio_ids:
            result = await db.execute(
                select(func.count(Ejercicio.id)).where(Ejercicio.id.in_(ejercicio_ids))
            )
            if result.scalar_one() != len(set(ejercicio_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more exercise IDs are invalid",
                )

        await db.execute(
            delete(RutinaEjercicio).where(RutinaEjercicio.rutina_id == rutina_id)
        )

        for item in update_data["ejercicios"]:
            re = RutinaEjercicio(
                rutina_id=rutina_id,
                ejercicio_id=item["ejercicio_id"],
                orden=item["orden"],
            )
            db.add(re)

    await db.commit()
    return await get_rutina(db, rutina_id)


async def delete_rutina(
    db: AsyncSession, rutina_id: int, current_user: Usuario
) -> None:
    rutina = await _get_or_404(db, rutina_id)
    _check_ownership(rutina, current_user)
    await db.delete(rutina)
    await db.commit()


async def asignar_rutina(
    db: AsyncSession, rutina_id: int, data: AsignacionCreate, current_user: Usuario
) -> AsignacionRead:
    rutina = await _get_or_404(db, rutina_id)
    _check_ownership(rutina, current_user)

    result = await db.execute(
        select(Usuario).where(Usuario.id == data.alumno_id)
    )
    alumno = result.scalar_one_or_none()
    if alumno is None or alumno.rol != RolUsuario.ALUMNO:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found",
        )

    existing = await db.execute(
        select(RutinaAsignacion).where(
            RutinaAsignacion.rutina_id == rutina_id,
            RutinaAsignacion.alumno_id == data.alumno_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Routine already assigned to this student",
        )

    asignacion = RutinaAsignacion(
        rutina_id=rutina_id,
        alumno_id=data.alumno_id,
    )
    db.add(asignacion)
    await db.commit()
    await db.refresh(asignacion)

    return AsignacionRead(
        id=asignacion.id,
        rutina_id=asignacion.rutina_id,
        alumno_id=asignacion.alumno_id,
        fecha_asignacion=asignacion.fecha_asignacion,
        alumno_nombre=f"{alumno.nombre} {alumno.apellido}",
    )


async def desasignar_rutina(
    db: AsyncSession, rutina_id: int, alumno_id: int, current_user: Usuario
) -> None:
    rutina = await _get_or_404(db, rutina_id)
    _check_ownership(rutina, current_user)

    result = await db.execute(
        select(RutinaAsignacion).where(
            RutinaAsignacion.rutina_id == rutina_id,
            RutinaAsignacion.alumno_id == alumno_id,
        )
    )
    asignacion = result.scalar_one_or_none()
    if asignacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    await db.delete(asignacion)
    await db.commit()


async def get_rutinas_alumno(
    db: AsyncSession, alumno_id: int
) -> list[AlumnoRutinaRead]:
    result = await db.execute(
        select(RutinaAsignacion)
        .where(RutinaAsignacion.alumno_id == alumno_id)
        .options(
            selectinload(RutinaAsignacion.rutina).selectinload(Rutina.profesor),
            selectinload(RutinaAsignacion.rutina).selectinload(Rutina.ejercicios),
        )
        .order_by(RutinaAsignacion.fecha_asignacion.desc())
    )
    asignaciones = list(result.scalars().all())

    return [
        AlumnoRutinaRead(
            id=a.rutina.id,
            nombre=a.rutina.nombre,
            descripcion=a.rutina.descripcion,
            profesor_nombre=f"{a.rutina.profesor.nombre} {a.rutina.profesor.apellido}",
            ejercicio_count=len(a.rutina.ejercicios),
            fecha_asignacion=a.fecha_asignacion,
        )
        for a in asignaciones
    ]


async def get_rutina_alumno(
    db: AsyncSession, alumno_id: int, rutina_id: int
) -> RutinaDetailRead:
    result = await db.execute(
        select(RutinaAsignacion).where(
            RutinaAsignacion.alumno_id == alumno_id,
            RutinaAsignacion.rutina_id == rutina_id,
        )
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not assigned to this student",
        )

    return await get_rutina(db, rutina_id)


async def list_asignaciones(
    db: AsyncSession, rutina_id: int
) -> list[AsignacionRead]:
    await _get_or_404(db, rutina_id)
    result = await db.execute(
        select(RutinaAsignacion)
        .where(RutinaAsignacion.rutina_id == rutina_id)
        .options(selectinload(RutinaAsignacion.alumno))
        .order_by(RutinaAsignacion.fecha_asignacion.desc())
    )
    items = list(result.scalars().all())

    return [
        AsignacionRead(
            id=a.id,
            rutina_id=a.rutina_id,
            alumno_id=a.alumno_id,
            fecha_asignacion=a.fecha_asignacion,
            alumno_nombre=f"{a.alumno.nombre} {a.alumno.apellido}",
        )
        for a in items
    ]


async def _get_or_404(db: AsyncSession, rutina_id: int) -> Rutina:
    result = await db.execute(
        select(Rutina).where(Rutina.id == rutina_id)
    )
    rutina = result.scalar_one_or_none()
    if rutina is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not found",
        )
    return rutina


async def _get_with_relations(db: AsyncSession, rutina_id: int) -> Rutina:
    result = await db.execute(
        select(Rutina)
        .where(Rutina.id == rutina_id)
        .options(
            selectinload(Rutina.profesor),
            selectinload(Rutina.ejercicios).selectinload(RutinaEjercicio.ejercicio),
        )
    )
    rutina = result.scalar_one_or_none()
    if rutina is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Routine not found",
        )
    return rutina


def _check_ownership(rutina: Rutina, user: Usuario) -> None:
    if user.rol == RolUsuario.ADMIN:
        return
    if rutina.profesor_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only manage your own routines",
        )
