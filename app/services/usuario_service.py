import math

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.usuario import UserList, UserUpdate


async def list_usuarios(
    db: AsyncSession,
    *,
    rol: str | None = None,
    activo: bool | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> UserList:
    query = select(Usuario)
    count_query = select(func.count(Usuario.id))

    if rol is not None:
        query = query.where(Usuario.rol == rol)
        count_query = count_query.where(Usuario.rol == rol)

    if activo is not None:
        query = query.where(Usuario.activo.is_(activo))
        count_query = count_query.where(Usuario.activo.is_(activo))

    if search:
        pattern = f"%{search}%"
        search_filter = or_(
            Usuario.nombre.ilike(pattern),
            Usuario.apellido.ilike(pattern),
            Usuario.email.ilike(pattern),
            Usuario.dni.ilike(pattern),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Usuario.apellido, Usuario.nombre).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return UserList(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


async def get_usuario(db: AsyncSession, usuario_id: int) -> Usuario:
    return await _get_or_404(db, usuario_id)


async def update_usuario(
    db: AsyncSession,
    usuario_id: int,
    data: UserUpdate,
    current_user: Usuario,
) -> Usuario:
    usuario = await _get_or_404(db, usuario_id)
    update_data = data.model_dump(exclude_unset=True)

    if not update_data:
        return usuario

    is_self = current_user.id == usuario_id
    is_admin = current_user.rol == RolUsuario.ADMIN

    if not is_admin and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own profile",
        )

    if not is_admin:
        update_data.pop("rol", None)
        update_data.pop("activo", None)

    if "email" in update_data:
        await _check_unique_email(db, update_data["email"], usuario_id)

    if "dni" in update_data and update_data["dni"] is not None:
        await _check_unique_dni(db, update_data["dni"], usuario_id)

    for field, value in update_data.items():
        setattr(usuario, field, value)

    await db.commit()
    await db.refresh(usuario)
    return usuario


async def toggle_activo(
    db: AsyncSession,
    usuario_id: int,
    current_user: Usuario,
) -> Usuario:
    if current_user.id == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    usuario = await _get_or_404(db, usuario_id)
    usuario.activo = not usuario.activo
    await db.commit()
    await db.refresh(usuario)
    return usuario


async def list_profesores(db: AsyncSession) -> list[Usuario]:
    result = await db.execute(
        select(Usuario)
        .where(Usuario.rol == RolUsuario.PROFESOR, Usuario.activo.is_(True))
        .order_by(Usuario.apellido, Usuario.nombre)
    )
    return list(result.scalars().all())


async def _get_or_404(db: AsyncSession, usuario_id: int) -> Usuario:
    result = await db.execute(
        select(Usuario).where(Usuario.id == usuario_id)
    )
    usuario = result.scalar_one_or_none()
    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return usuario


async def _check_unique_email(
    db: AsyncSession, email: str, exclude_id: int
) -> None:
    result = await db.execute(
        select(Usuario).where(
            Usuario.email == email,
            Usuario.id != exclude_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use",
        )


async def _check_unique_dni(
    db: AsyncSession, dni: str, exclude_id: int
) -> None:
    result = await db.execute(
        select(Usuario).where(
            Usuario.dni == dni,
            Usuario.id != exclude_id,
        )
    )
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DNI already in use",
        )
