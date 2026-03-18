from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, Token
from app.schemas.usuario import UserCreate, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    if data.dni:
        result = await db.execute(select(Usuario).where(Usuario.dni == data.dni))
        if result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="DNI already registered",
            )

    user = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        password_hash=hash_password(data.password),
        telefono=data.telefono,
        dni=data.dni,
        fecha_nacimiento=data.fecha_nacimiento,
        rol=RolUsuario.ALUMNO,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    token = create_access_token(subject=user.id)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(user: Usuario = Depends(get_current_active_user)):
    return user
