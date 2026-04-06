# Rutinas & Ejercicios + Tests Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete Rutinas/Ejercicios feature (backend + frontend) and verify backend test coverage.

**Architecture:** Four new SQLAlchemy models (Ejercicio, Rutina, RutinaEjercicio, RutinaAsignacion) with CRUD services/routers following existing patterns. Frontend adds alumno view (list → detail → video modal) and admin/profesor management pages. All new code follows existing async patterns with SQLAlchemy 2.0 mapped columns, Pydantic v2 schemas, and React + TypeScript + Tailwind components.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 async, Pydantic v2, pytest + httpx, React 19, TypeScript, Tailwind CSS, React Router v7

---

## File Structure

### Backend (create)
- `app/models/ejercicio.py` — Ejercicio model
- `app/models/rutina.py` — Rutina, RutinaEjercicio, RutinaAsignacion models
- `app/schemas/ejercicio.py` — Ejercicio Pydantic schemas
- `app/schemas/rutina.py` — Rutina Pydantic schemas
- `app/services/ejercicio_service.py` — Ejercicio CRUD service
- `app/services/rutina_service.py` — Rutina CRUD + assignment service
- `app/api/ejercicios.py` — Ejercicio router
- `app/api/rutinas.py` — Rutina router
- `app/tests/test_ejercicios.py` — Ejercicio endpoint tests
- `app/tests/test_rutinas.py` — Rutina endpoint tests

### Backend (modify)
- `app/models/__init__.py` — Export new models
- `app/models/usuario.py` — Add relationships to Rutina/RutinaAsignacion
- `app/main.py` — Register new routers, import new models in startup

### Frontend (create)
- `frontend/src/services/rutinaApi.ts` — API calls for rutinas/ejercicios
- `frontend/src/pages/alumno/Rutinas.tsx` — Alumno rutinas list
- `frontend/src/pages/alumno/RutinaDetalle.tsx` — Alumno rutina detail + video modal
- `frontend/src/pages/admin/Ejercicios.tsx` — Admin ejercicios CRUD
- `frontend/src/pages/admin/Rutinas.tsx` — Admin rutinas CRUD + assignment

### Frontend (modify)
- `frontend/src/App.tsx` — Add new routes
- `frontend/src/layouts/MainLayout.tsx` — Add nav items for rutinas

---

### Task 1: Backend Models

**Files:**
- Create: `app/models/ejercicio.py`
- Create: `app/models/rutina.py`
- Modify: `app/models/__init__.py`
- Modify: `app/models/usuario.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create Ejercicio model**

Create `app/models/ejercicio.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ejercicio(Base):
    __tablename__ = "ejercicios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), unique=True)
    video_url: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    rutina_ejercicios: Mapped[list["RutinaEjercicio"]] = relationship(  # noqa: F821
        back_populates="ejercicio", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Ejercicio {self.id}: {self.nombre}>"
```

- [ ] **Step 2: Create Rutina, RutinaEjercicio, RutinaAsignacion models**

Create `app/models/rutina.py`:

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Rutina(Base):
    __tablename__ = "rutinas"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200))
    descripcion: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    profesor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    profesor: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="rutinas_creadas", foreign_keys=[profesor_id]
    )
    ejercicios: Mapped[list["RutinaEjercicio"]] = relationship(
        back_populates="rutina", cascade="all, delete-orphan",
        order_by="RutinaEjercicio.orden"
    )
    asignaciones: Mapped[list["RutinaAsignacion"]] = relationship(
        back_populates="rutina", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Rutina {self.id}: {self.nombre}>"


class RutinaEjercicio(Base):
    __tablename__ = "rutina_ejercicios"
    __table_args__ = (
        UniqueConstraint("rutina_id", "ejercicio_id", name="uq_rutina_ejercicio"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    rutina_id: Mapped[int] = mapped_column(ForeignKey("rutinas.id"))
    ejercicio_id: Mapped[int] = mapped_column(ForeignKey("ejercicios.id"))
    orden: Mapped[int] = mapped_column(default=0)

    rutina: Mapped["Rutina"] = relationship(back_populates="ejercicios")
    ejercicio: Mapped["Ejercicio"] = relationship(  # noqa: F821
        back_populates="rutina_ejercicios"
    )

    def __repr__(self) -> str:
        return f"<RutinaEjercicio rutina={self.rutina_id} ejercicio={self.ejercicio_id}>"


class RutinaAsignacion(Base):
    __tablename__ = "rutina_asignaciones"
    __table_args__ = (
        UniqueConstraint("rutina_id", "alumno_id", name="uq_rutina_alumno"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    rutina_id: Mapped[int] = mapped_column(ForeignKey("rutinas.id"))
    alumno_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    fecha_asignacion: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )

    rutina: Mapped["Rutina"] = relationship(back_populates="asignaciones")
    alumno: Mapped["Usuario"] = relationship(  # noqa: F821
        back_populates="rutinas_asignadas", foreign_keys=[alumno_id]
    )

    def __repr__(self) -> str:
        return f"<RutinaAsignacion rutina={self.rutina_id} alumno={self.alumno_id}>"
```

- [ ] **Step 3: Add relationships to Usuario model**

In `app/models/usuario.py`, add these two relationships to the `Usuario` class (after the existing `notificaciones` relationship):

```python
    rutinas_creadas: Mapped[list["Rutina"]] = relationship(  # noqa: F821
        back_populates="profesor", foreign_keys="[Rutina.profesor_id]"
    )
    rutinas_asignadas: Mapped[list["RutinaAsignacion"]] = relationship(  # noqa: F821
        back_populates="alumno", foreign_keys="[RutinaAsignacion.alumno_id]"
    )
```

- [ ] **Step 4: Export new models in __init__.py**

Add to `app/models/__init__.py`:

```python
from app.models.ejercicio import Ejercicio
from app.models.rutina import Rutina, RutinaAsignacion, RutinaEjercicio
```

And add to `__all__`:

```python
    "Ejercicio",
    "Rutina",
    "RutinaAsignacion",
    "RutinaEjercicio",
```

- [ ] **Step 5: Register models in main.py startup**

In `app/main.py`, add `Ejercicio, Rutina, RutinaAsignacion, RutinaEjercicio` to the import inside `on_startup`.

- [ ] **Step 6: Verify models load**

Run: `python -c "from app.models import Ejercicio, Rutina, RutinaEjercicio, RutinaAsignacion; print('OK')"`
Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add app/models/ejercicio.py app/models/rutina.py app/models/__init__.py app/models/usuario.py app/main.py
git commit -m "feat: add Ejercicio, Rutina, RutinaEjercicio, RutinaAsignacion models"
```

---

### Task 2: Backend Schemas

**Files:**
- Create: `app/schemas/ejercicio.py`
- Create: `app/schemas/rutina.py`

- [ ] **Step 1: Create Ejercicio schemas**

Create `app/schemas/ejercicio.py`:

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EjercicioCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    video_url: str = Field(min_length=1, max_length=500)


class EjercicioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    video_url: str | None = Field(default=None, min_length=1, max_length=500)


class EjercicioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    video_url: str
    created_at: datetime


class EjercicioList(BaseModel):
    items: list[EjercicioRead]
    total: int
    page: int
    page_size: int
    pages: int
```

- [ ] **Step 2: Create Rutina schemas**

Create `app/schemas/rutina.py`:

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.ejercicio import EjercicioRead


class RutinaEjercicioItem(BaseModel):
    ejercicio_id: int = Field(gt=0)
    orden: int = Field(ge=0)


class RutinaCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    descripcion: str | None = Field(default=None, max_length=1000)
    ejercicios: list[RutinaEjercicioItem] = Field(default_factory=list)


class RutinaUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=200)
    descripcion: str | None = None
    ejercicios: list[RutinaEjercicioItem] | None = None


class RutinaEjercicioRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    orden: int
    ejercicio: EjercicioRead


class RutinaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    profesor_id: int
    profesor_nombre: str | None = None
    created_at: datetime
    ejercicio_count: int = 0


class RutinaDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    profesor_id: int
    profesor_nombre: str | None = None
    created_at: datetime
    ejercicios: list[RutinaEjercicioRead]


class RutinaList(BaseModel):
    items: list[RutinaRead]
    total: int
    page: int
    page_size: int
    pages: int


class AsignacionCreate(BaseModel):
    alumno_id: int = Field(gt=0)


class AsignacionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rutina_id: int
    alumno_id: int
    fecha_asignacion: datetime
    alumno_nombre: str | None = None


class AlumnoRutinaRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    descripcion: str | None
    profesor_nombre: str | None = None
    ejercicio_count: int = 0
    fecha_asignacion: datetime
```

- [ ] **Step 3: Commit**

```bash
git add app/schemas/ejercicio.py app/schemas/rutina.py
git commit -m "feat: add Ejercicio and Rutina Pydantic schemas"
```

---

### Task 3: Ejercicio Service & Router

**Files:**
- Create: `app/services/ejercicio_service.py`
- Create: `app/api/ejercicios.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create ejercicio_service.py**

```python
import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ejercicio import Ejercicio
from app.schemas.ejercicio import EjercicioCreate, EjercicioList, EjercicioUpdate


async def list_ejercicios(
    db: AsyncSession,
    *,
    nombre: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> EjercicioList:
    query = select(Ejercicio)
    count_query = select(func.count(Ejercicio.id))

    if nombre:
        query = query.where(Ejercicio.nombre.ilike(f"%{nombre}%"))
        count_query = count_query.where(Ejercicio.nombre.ilike(f"%{nombre}%"))

    total = (await db.execute(count_query)).scalar_one()
    pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size

    query = query.order_by(Ejercicio.nombre).offset(offset).limit(page_size)
    result = await db.execute(query)
    items = list(result.scalars().all())

    return EjercicioList(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


async def get_ejercicio(db: AsyncSession, ejercicio_id: int) -> Ejercicio:
    return await _get_or_404(db, ejercicio_id)


async def create_ejercicio(db: AsyncSession, data: EjercicioCreate) -> Ejercicio:
    existing = await db.execute(
        select(Ejercicio).where(Ejercicio.nombre == data.nombre)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An exercise with this name already exists",
        )

    ejercicio = Ejercicio(**data.model_dump())
    db.add(ejercicio)
    await db.commit()
    await db.refresh(ejercicio)
    return ejercicio


async def update_ejercicio(
    db: AsyncSession, ejercicio_id: int, data: EjercicioUpdate
) -> Ejercicio:
    ejercicio = await _get_or_404(db, ejercicio_id)
    update_data = data.model_dump(exclude_unset=True)

    if "nombre" in update_data:
        existing = await db.execute(
            select(Ejercicio).where(
                Ejercicio.nombre == update_data["nombre"],
                Ejercicio.id != ejercicio_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An exercise with this name already exists",
            )

    for field, value in update_data.items():
        setattr(ejercicio, field, value)

    await db.commit()
    await db.refresh(ejercicio)
    return ejercicio


async def delete_ejercicio(db: AsyncSession, ejercicio_id: int) -> None:
    ejercicio = await _get_or_404(db, ejercicio_id)
    await db.delete(ejercicio)
    await db.commit()


async def _get_or_404(db: AsyncSession, ejercicio_id: int) -> Ejercicio:
    result = await db.execute(
        select(Ejercicio).where(Ejercicio.id == ejercicio_id)
    )
    ejercicio = result.scalar_one_or_none()
    if ejercicio is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )
    return ejercicio
```

- [ ] **Step 2: Create ejercicios router**

Create `app/api/ejercicios.py`:

```python
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
```

- [ ] **Step 3: Register router in main.py**

Add to imports in `app/main.py`:

```python
from app.api.ejercicios import router as ejercicios_router
```

Add after existing `include_router` calls:

```python
app.include_router(ejercicios_router)
```

- [ ] **Step 4: Commit**

```bash
git add app/services/ejercicio_service.py app/api/ejercicios.py app/main.py
git commit -m "feat: add ejercicio service and API router"
```

---

### Task 4: Rutina Service & Router

**Files:**
- Create: `app/services/rutina_service.py`
- Create: `app/api/rutinas.py`
- Modify: `app/main.py`

- [ ] **Step 1: Create rutina_service.py**

```python
import math

from fastapi import HTTPException, status
from sqlalchemy import func, select
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

        # Delete existing and re-create
        await db.execute(
            select(RutinaEjercicio).where(RutinaEjercicio.rutina_id == rutina_id)
        )
        from sqlalchemy import delete
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

    alumno = await db.execute(
        select(Usuario).where(Usuario.id == data.alumno_id)
    )
    alumno = alumno.scalar_one_or_none()
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
```

- [ ] **Step 2: Create rutinas router**

Create `app/api/rutinas.py`:

```python
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
```

- [ ] **Step 3: Register router in main.py**

Add to imports:

```python
from app.api.rutinas import router as rutinas_router
```

Add:

```python
app.include_router(rutinas_router)
```

- [ ] **Step 4: Commit**

```bash
git add app/services/rutina_service.py app/api/rutinas.py app/main.py
git commit -m "feat: add rutina service and API router with assignments"
```

---

### Task 5: Backend Tests for Ejercicios

**Files:**
- Create: `app/tests/test_ejercicios.py`

- [ ] **Step 1: Write ejercicio tests**

Create `app/tests/test_ejercicios.py`:

```python
import pytest

from app.core.security import create_access_token, hash_password
from app.models.ejercicio import Ejercicio
from app.models.enums import RolUsuario
from app.models.usuario import Usuario

BASE = "/api/ejercicios"


async def _create_user(db_session, *, rol=RolUsuario.ADMIN, email="admin@test.com"):
    user = Usuario(
        nombre="Test",
        apellido="User",
        email=email,
        password_hash=hash_password("testpassword"),
        rol=rol,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_ejercicio(db_session, *, nombre="Press Banca", video_url="https://youtube.com/watch?v=abc"):
    ej = Ejercicio(nombre=nombre, video_url=video_url)
    db_session.add(ej)
    await db_session.commit()
    await db_session.refresh(ej)
    return ej


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


class TestListEjercicios:
    @pytest.mark.asyncio
    async def test_list_empty(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.get(BASE, headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_returns_items(self, client, db_session):
        admin = await _create_user(db_session)
        await _create_ejercicio(db_session, nombre="Press Banca")
        await _create_ejercicio(db_session, nombre="Sentadilla")

        r = await client.get(BASE, headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2

    @pytest.mark.asyncio
    async def test_list_search_by_name(self, client, db_session):
        admin = await _create_user(db_session)
        await _create_ejercicio(db_session, nombre="Press Banca")
        await _create_ejercicio(db_session, nombre="Sentadilla")

        r = await client.get(BASE, params={"nombre": "press"}, headers=_auth(admin))
        assert r.status_code == 200
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["nombre"] == "Press Banca"

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client):
        r = await client.get(BASE)
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_list_denied_for_alumno(self, client, db_session):
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="al@test.com")
        r = await client.get(BASE, headers=_auth(alumno))
        assert r.status_code == 403


class TestCreateEjercicio:
    @pytest.mark.asyncio
    async def test_create_success(self, client, db_session):
        admin = await _create_user(db_session)
        payload = {"nombre": "Curl Bíceps", "video_url": "https://youtube.com/watch?v=xyz"}
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 201
        data = r.json()
        assert data["nombre"] == "Curl Bíceps"
        assert data["video_url"] == "https://youtube.com/watch?v=xyz"
        assert data["id"] is not None

    @pytest.mark.asyncio
    async def test_create_duplicate_name(self, client, db_session):
        admin = await _create_user(db_session)
        await _create_ejercicio(db_session, nombre="Press Banca")
        payload = {"nombre": "Press Banca", "video_url": "https://youtube.com/watch?v=new"}
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_create_profesor_allowed(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        payload = {"nombre": "Remo", "video_url": "https://youtube.com/watch?v=remo"}
        r = await client.post(BASE, json=payload, headers=_auth(prof))
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_create_alumno_denied(self, client, db_session):
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="al@test.com")
        payload = {"nombre": "Remo", "video_url": "https://youtube.com/watch?v=remo"}
        r = await client.post(BASE, json=payload, headers=_auth(alumno))
        assert r.status_code == 403


class TestUpdateEjercicio:
    @pytest.mark.asyncio
    async def test_update_success(self, client, db_session):
        admin = await _create_user(db_session)
        ej = await _create_ejercicio(db_session)
        r = await client.put(f"{BASE}/{ej.id}", json={"nombre": "Press Inclinado"}, headers=_auth(admin))
        assert r.status_code == 200
        assert r.json()["nombre"] == "Press Inclinado"

    @pytest.mark.asyncio
    async def test_update_not_found(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.put(f"{BASE}/999", json={"nombre": "X"}, headers=_auth(admin))
        assert r.status_code == 404


class TestDeleteEjercicio:
    @pytest.mark.asyncio
    async def test_delete_success(self, client, db_session):
        admin = await _create_user(db_session)
        ej = await _create_ejercicio(db_session)
        r = await client.delete(f"{BASE}/{ej.id}", headers=_auth(admin))
        assert r.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_not_found(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.delete(f"{BASE}/999", headers=_auth(admin))
        assert r.status_code == 404
```

- [ ] **Step 2: Run tests**

Run: `python -m pytest app/tests/test_ejercicios.py -v`
Expected: All PASS

- [ ] **Step 3: Commit**

```bash
git add app/tests/test_ejercicios.py
git commit -m "test: add ejercicio endpoint tests"
```

---

### Task 6: Backend Tests for Rutinas

**Files:**
- Create: `app/tests/test_rutinas.py`

- [ ] **Step 1: Write rutina tests**

Create `app/tests/test_rutinas.py`:

```python
import pytest

from app.core.security import create_access_token, hash_password
from app.models.ejercicio import Ejercicio
from app.models.enums import RolUsuario
from app.models.rutina import Rutina, RutinaAsignacion, RutinaEjercicio
from app.models.usuario import Usuario

BASE = "/api/rutinas"


async def _create_user(db_session, *, rol=RolUsuario.ADMIN, email="admin@test.com"):
    user = Usuario(
        nombre="Test",
        apellido="User",
        email=email,
        password_hash=hash_password("testpassword"),
        rol=rol,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_ejercicio(db_session, *, nombre="Press Banca"):
    ej = Ejercicio(nombre=nombre, video_url="https://youtube.com/watch?v=abc")
    db_session.add(ej)
    await db_session.commit()
    await db_session.refresh(ej)
    return ej


async def _create_rutina(db_session, *, profesor, nombre="Fuerza", ejercicios=None):
    rutina = Rutina(nombre=nombre, profesor_id=profesor.id)
    db_session.add(rutina)
    await db_session.commit()
    await db_session.refresh(rutina)
    if ejercicios:
        for i, ej in enumerate(ejercicios):
            re = RutinaEjercicio(rutina_id=rutina.id, ejercicio_id=ej.id, orden=i)
            db_session.add(re)
        await db_session.commit()
    return rutina


async def _assign_rutina(db_session, *, rutina, alumno):
    asig = RutinaAsignacion(rutina_id=rutina.id, alumno_id=alumno.id)
    db_session.add(asig)
    await db_session.commit()
    await db_session.refresh(asig)
    return asig


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


class TestListRutinas:
    @pytest.mark.asyncio
    async def test_list_empty(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.get(BASE, headers=_auth(admin))
        assert r.status_code == 200
        assert r.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_list_returns_items(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR)
        await _create_rutina(db_session, profesor=prof, nombre="Fuerza")
        await _create_rutina(db_session, profesor=prof, nombre="Cardio")

        r = await client.get(BASE, headers=_auth(prof))
        assert r.status_code == 200
        assert r.json()["total"] == 2

    @pytest.mark.asyncio
    async def test_list_denied_for_alumno(self, client, db_session):
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="al@test.com")
        r = await client.get(BASE, headers=_auth(alumno))
        assert r.status_code == 403


class TestCreateRutina:
    @pytest.mark.asyncio
    async def test_create_empty(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR)
        payload = {"nombre": "Mi Rutina", "descripcion": "Desc"}
        r = await client.post(BASE, json=payload, headers=_auth(prof))
        assert r.status_code == 201
        data = r.json()
        assert data["nombre"] == "Mi Rutina"
        assert data["profesor_id"] == prof.id
        assert data["ejercicios"] == []

    @pytest.mark.asyncio
    async def test_create_with_exercises(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR)
        ej1 = await _create_ejercicio(db_session, nombre="Press")
        ej2 = await _create_ejercicio(db_session, nombre="Remo")

        payload = {
            "nombre": "Full Body",
            "ejercicios": [
                {"ejercicio_id": ej1.id, "orden": 0},
                {"ejercicio_id": ej2.id, "orden": 1},
            ],
        }
        r = await client.post(BASE, json=payload, headers=_auth(prof))
        assert r.status_code == 201
        data = r.json()
        assert len(data["ejercicios"]) == 2
        assert data["ejercicios"][0]["ejercicio"]["nombre"] == "Press"

    @pytest.mark.asyncio
    async def test_create_invalid_exercise_id(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR)
        payload = {
            "nombre": "Bad",
            "ejercicios": [{"ejercicio_id": 999, "orden": 0}],
        }
        r = await client.post(BASE, json=payload, headers=_auth(prof))
        assert r.status_code == 400


class TestUpdateRutina:
    @pytest.mark.asyncio
    async def test_update_name(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR)
        rutina = await _create_rutina(db_session, profesor=prof)
        r = await client.put(
            f"{BASE}/{rutina.id}",
            json={"nombre": "Updated"},
            headers=_auth(prof),
        )
        assert r.status_code == 200
        assert r.json()["nombre"] == "Updated"

    @pytest.mark.asyncio
    async def test_update_other_prof_denied(self, client, db_session):
        prof1 = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p1@test.com")
        prof2 = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p2@test.com")
        rutina = await _create_rutina(db_session, profesor=prof1)
        r = await client.put(
            f"{BASE}/{rutina.id}",
            json={"nombre": "Hack"},
            headers=_auth(prof2),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_update_any(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        admin = await _create_user(db_session, rol=RolUsuario.ADMIN, email="a@test.com")
        rutina = await _create_rutina(db_session, profesor=prof)
        r = await client.put(
            f"{BASE}/{rutina.id}",
            json={"nombre": "Admin Edit"},
            headers=_auth(admin),
        )
        assert r.status_code == 200


class TestDeleteRutina:
    @pytest.mark.asyncio
    async def test_delete_success(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR)
        rutina = await _create_rutina(db_session, profesor=prof)
        r = await client.delete(f"{BASE}/{rutina.id}", headers=_auth(prof))
        assert r.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_not_found(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR)
        r = await client.delete(f"{BASE}/999", headers=_auth(prof))
        assert r.status_code == 404


class TestAsignaciones:
    @pytest.mark.asyncio
    async def test_asignar(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a@test.com")
        rutina = await _create_rutina(db_session, profesor=prof)
        r = await client.post(
            f"{BASE}/{rutina.id}/asignar",
            json={"alumno_id": alumno.id},
            headers=_auth(prof),
        )
        assert r.status_code == 201
        assert r.json()["alumno_id"] == alumno.id

    @pytest.mark.asyncio
    async def test_asignar_duplicate(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a@test.com")
        rutina = await _create_rutina(db_session, profesor=prof)
        await _assign_rutina(db_session, rutina=rutina, alumno=alumno)

        r = await client.post(
            f"{BASE}/{rutina.id}/asignar",
            json={"alumno_id": alumno.id},
            headers=_auth(prof),
        )
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_desasignar(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a@test.com")
        rutina = await _create_rutina(db_session, profesor=prof)
        await _assign_rutina(db_session, rutina=rutina, alumno=alumno)

        r = await client.delete(
            f"{BASE}/{rutina.id}/asignar/{alumno.id}",
            headers=_auth(prof),
        )
        assert r.status_code == 204

    @pytest.mark.asyncio
    async def test_list_asignaciones(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a@test.com")
        rutina = await _create_rutina(db_session, profesor=prof)
        await _assign_rutina(db_session, rutina=rutina, alumno=alumno)

        r = await client.get(
            f"{BASE}/{rutina.id}/asignaciones",
            headers=_auth(prof),
        )
        assert r.status_code == 200
        assert len(r.json()) == 1


class TestAlumnoRutinas:
    @pytest.mark.asyncio
    async def test_alumno_sees_own_rutinas(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a@test.com")
        ej = await _create_ejercicio(db_session)
        rutina = await _create_rutina(db_session, profesor=prof, ejercicios=[ej])
        await _assign_rutina(db_session, rutina=rutina, alumno=alumno)

        r = await client.get(f"/api/alumnos/{alumno.id}/rutinas", headers=_auth(alumno))
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["nombre"] == "Fuerza"
        assert data[0]["ejercicio_count"] == 1

    @pytest.mark.asyncio
    async def test_alumno_sees_rutina_detail(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a@test.com")
        ej = await _create_ejercicio(db_session)
        rutina = await _create_rutina(db_session, profesor=prof, ejercicios=[ej])
        await _assign_rutina(db_session, rutina=rutina, alumno=alumno)

        r = await client.get(
            f"/api/alumnos/{alumno.id}/rutinas/{rutina.id}",
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["nombre"] == "Fuerza"
        assert len(data["ejercicios"]) == 1
        assert data["ejercicios"][0]["ejercicio"]["video_url"] is not None

    @pytest.mark.asyncio
    async def test_alumno_cannot_see_unassigned(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a@test.com")
        rutina = await _create_rutina(db_session, profesor=prof)

        r = await client.get(
            f"/api/alumnos/{alumno.id}/rutinas/{rutina.id}",
            headers=_auth(alumno),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_alumno_cannot_see_others(self, client, db_session):
        prof = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="p@test.com")
        alumno1 = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a1@test.com")
        alumno2 = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="a2@test.com")
        rutina = await _create_rutina(db_session, profesor=prof)
        await _assign_rutina(db_session, rutina=rutina, alumno=alumno1)

        r = await client.get(
            f"/api/alumnos/{alumno1.id}/rutinas",
            headers=_auth(alumno2),
        )
        assert r.status_code == 403
```

- [ ] **Step 2: Run tests**

Run: `python -m pytest app/tests/test_rutinas.py -v`
Expected: All PASS

- [ ] **Step 3: Run all tests to ensure nothing broke**

Run: `python -m pytest app/tests/ -q --tb=short`
Expected: All pass (437 + new tests)

- [ ] **Step 4: Commit**

```bash
git add app/tests/test_ejercicios.py app/tests/test_rutinas.py
git commit -m "test: add ejercicio and rutina endpoint tests"
```

---

### Task 7: Frontend API Service

**Files:**
- Create: `frontend/src/services/rutinaApi.ts`

- [ ] **Step 1: Create rutinaApi.ts**

```typescript
import api from "./api";
import type { PaginatedResponse } from "./adminApi";

export interface Ejercicio {
  id: number;
  nombre: string;
  video_url: string;
  created_at: string;
}

export interface EjercicioForm {
  nombre: string;
  video_url: string;
}

export interface RutinaEjercicioItem {
  ejercicio_id: number;
  orden: number;
}

export interface RutinaEjercicio {
  id: number;
  orden: number;
  ejercicio: Ejercicio;
}

export interface Rutina {
  id: number;
  nombre: string;
  descripcion: string | null;
  profesor_id: number;
  profesor_nombre: string | null;
  created_at: string;
  ejercicio_count: number;
}

export interface RutinaDetail {
  id: number;
  nombre: string;
  descripcion: string | null;
  profesor_id: number;
  profesor_nombre: string | null;
  created_at: string;
  ejercicios: RutinaEjercicio[];
}

export interface RutinaForm {
  nombre: string;
  descripcion?: string;
  ejercicios?: RutinaEjercicioItem[];
}

export interface Asignacion {
  id: number;
  rutina_id: number;
  alumno_id: number;
  fecha_asignacion: string;
  alumno_nombre: string | null;
}

export interface AlumnoRutina {
  id: number;
  nombre: string;
  descripcion: string | null;
  profesor_nombre: string | null;
  ejercicio_count: number;
  fecha_asignacion: string;
}

// ─── Ejercicios (Admin/Profesor) ──────────────────────────────
export const ejerciciosApi = {
  list: (params?: { nombre?: string; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Ejercicio>>("/ejercicios", { params }),
  get: (id: number) => api.get<Ejercicio>(`/ejercicios/${id}`),
  create: (data: EjercicioForm) =>
    api.post<Ejercicio>("/ejercicios", data),
  update: (id: number, data: Partial<EjercicioForm>) =>
    api.put<Ejercicio>(`/ejercicios/${id}`, data),
  delete: (id: number) => api.delete(`/ejercicios/${id}`),
};

// ─── Rutinas (Admin/Profesor) ─────────────────────────────────
export const rutinasApi = {
  list: (params?: { nombre?: string; profesor_id?: number; page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Rutina>>("/rutinas", { params }),
  get: (id: number) => api.get<RutinaDetail>(`/rutinas/${id}`),
  create: (data: RutinaForm) =>
    api.post<RutinaDetail>("/rutinas", data),
  update: (id: number, data: Partial<RutinaForm>) =>
    api.put<RutinaDetail>(`/rutinas/${id}`, data),
  delete: (id: number) => api.delete(`/rutinas/${id}`),
  asignar: (rutinaId: number, alumnoId: number) =>
    api.post<Asignacion>(`/rutinas/${rutinaId}/asignar`, { alumno_id: alumnoId }),
  desasignar: (rutinaId: number, alumnoId: number) =>
    api.delete(`/rutinas/${rutinaId}/asignar/${alumnoId}`),
  listAsignaciones: (rutinaId: number) =>
    api.get<Asignacion[]>(`/rutinas/${rutinaId}/asignaciones`),
};

// ─── Rutinas Alumno ───────────────────────────────────────────
export const rutinasAlumnoApi = {
  list: (alumnoId: number) =>
    api.get<AlumnoRutina[]>(`/alumnos/${alumnoId}/rutinas`),
  get: (alumnoId: number, rutinaId: number) =>
    api.get<RutinaDetail>(`/alumnos/${alumnoId}/rutinas/${rutinaId}`),
};
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/rutinaApi.ts
git commit -m "feat: add rutina API service for frontend"
```

---

### Task 8: Frontend — Alumno Rutinas Pages

**Files:**
- Create: `frontend/src/pages/alumno/Rutinas.tsx`
- Create: `frontend/src/pages/alumno/RutinaDetalle.tsx`

- [ ] **Step 1: Create Rutinas.tsx (list view)**

Create `frontend/src/pages/alumno/Rutinas.tsx`: Build a page that shows "Mis Rutinas" with a clean list layout. Each row has a colored icon (using gradient backgrounds matching the routine index), routine name, exercise count + professor name, and a chevron. Click navigates to `/alumno/rutinas/:id`. Use `useAuth` for user ID, `rutinasAlumnoApi.list()`, and existing `Spinner`, `Card`, `EmptyState` components. Follow exact patterns from `Inscripciones.tsx`: loading spinner in center, error box with `border-danger-200`, header with `text-2xl font-bold text-neutral-900`.

Icon colors to cycle through: `["from-indigo-500 to-purple-500", "from-emerald-500 to-green-600", "from-amber-500 to-orange-500", "from-rose-500 to-pink-500", "from-sky-500 to-blue-500"]`.

- [ ] **Step 2: Create RutinaDetalle.tsx (detail + video modal)**

Create `frontend/src/pages/alumno/RutinaDetalle.tsx`: Build a page that shows routine detail with exercises. Has a back button (`← Volver` linking to `/alumno/rutinas`), header with routine icon + name + exercise count + professor, then a numbered list of exercises. Each exercise row: number, name, play button (indigo circle with white play icon). Click opens the existing `Modal` component with `size="lg"` containing an embedded YouTube iframe. Extract YouTube video ID from URL and embed as `https://www.youtube.com/embed/{videoId}`. Use `useParams` to get `rutinaId`, `rutinasAlumnoApi.get()`. Modal title is the exercise name.

YouTube URL parser: handle `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/alumno/Rutinas.tsx frontend/src/pages/alumno/RutinaDetalle.tsx
git commit -m "feat: add alumno rutinas list and detail pages"
```

---

### Task 9: Frontend — Admin/Profesor Ejercicios Page

**Files:**
- Create: `frontend/src/pages/admin/Ejercicios.tsx`

- [ ] **Step 1: Create Ejercicios.tsx**

Build a CRUD page following exact pattern from `admin/Actividades.tsx`. Table columns: Nombre (`font-medium text-neutral-900`), Video URL (truncated with `truncate`, max-w-[300px]), Acciones (Edit + Delete buttons). Modal form with two `Input` fields: Nombre and Video URL (YouTube link). Use `ejerciciosApi` from `rutinaApi.ts`. Include search with debounce, pagination, empty state. Header: "Gestión de Ejercicios" with "Nuevo Ejercicio" button.

Validation: nombre required, video_url required.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/Ejercicios.tsx
git commit -m "feat: add admin ejercicios CRUD page"
```

---

### Task 10: Frontend — Admin/Profesor Rutinas Page

**Files:**
- Create: `frontend/src/pages/admin/Rutinas.tsx`

- [ ] **Step 1: Create Rutinas.tsx**

Build a CRUD page following `admin/Actividades.tsx` pattern. Table columns: Nombre, Profesor, Ejercicios (count), Acciones (Edit, Asignar, Delete).

**Create/Edit Modal:** Form with nombre (Input), descripcion (textarea), ejercicios selection. For exercise selection: fetch all ejercicios via `ejerciciosApi.list({page_size: 100})`, display as checkboxes in a scrollable container (`max-h-60 overflow-y-auto`). Selected exercises are shown with drag handles (or simple up/down buttons) for ordering. Store as `RutinaEjercicioItem[]`.

**Assign Modal:** Separate modal for assigning rutina to students. Shows current assignments (list with delete button). Has a select/search for students (fetch from `/api/usuarios?rol=alumno`) with an "Asignar" button. Uses `rutinasApi.asignar()` and `rutinasApi.desasignar()`.

Use `rutinasApi` from `rutinaApi.ts`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/Rutinas.tsx
git commit -m "feat: add admin rutinas CRUD and assignment page"
```

---

### Task 11: Frontend — Routes and Navigation

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Add routes to App.tsx**

Add imports for new pages at top of App.tsx:

```typescript
import AlumnoRutinas from "./pages/alumno/Rutinas";
import AlumnoRutinaDetalle from "./pages/alumno/RutinaDetalle";
import AdminEjercicios from "./pages/admin/Ejercicios";
import AdminRutinas from "./pages/admin/Rutinas";
```

Inside alumno routes section, add:

```tsx
<Route path="alumno/rutinas" element={<AlumnoRutinas />} />
<Route path="alumno/rutinas/:rutinaId" element={<AlumnoRutinaDetalle />} />
```

Inside admin routes section, add:

```tsx
<Route path="admin/ejercicios" element={<AdminEjercicios />} />
<Route path="admin/rutinas" element={<AdminRutinas />} />
```

Inside profesor routes section, add:

```tsx
<Route path="profesor/ejercicios" element={<AdminEjercicios />} />
<Route path="profesor/rutinas" element={<AdminRutinas />} />
```

- [ ] **Step 2: Add nav items to MainLayout.tsx**

Add to `ALUMNO_NAV_ITEMS` array (after the "Mi Perfil" entry):

```typescript
{ to: "/alumno/rutinas", label: "Mis Rutinas", icon: ClipboardDocIcon, section: "alumno" },
```

Add to `ADMIN_NAV_ITEMS` array (after "Planes" entry):

```typescript
{ to: "/admin/ejercicios", label: "Ejercicios", icon: ActivityIcon, adminOnly: true, section: "admin" },
{ to: "/admin/rutinas", label: "Rutinas", icon: ClipboardDocIcon, adminOnly: true, section: "admin" },
```

Add to `PROFESOR_NAV_ITEMS` array (after "Evaluaciones" entry):

```typescript
{ to: "/profesor/ejercicios", label: "Ejercicios", icon: ActivityIcon, section: "profesor" },
{ to: "/profesor/rutinas", label: "Rutinas", icon: ClipboardDocIcon, section: "profesor" },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/layouts/MainLayout.tsx
git commit -m "feat: add rutinas routes and navigation items"
```

---

### Task 12: Verify All Tests Pass and Mark Task #26

- [ ] **Step 1: Run full backend test suite**

Run: `python -m pytest app/tests/ -q --tb=short`
Expected: All tests pass (previous 437 + new ejercicio/rutina tests)

- [ ] **Step 2: Verify frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Mark task #26 as done in the task database**

```python
python -c "
import sqlite3
conn = sqlite3.connect('.tareas/tareas.db')
conn.execute(\"UPDATE tasks SET status='done' WHERE id=26\")
conn.commit()
conn.close()
print('Task #26 marked as done')
"
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete rutinas feature and verify test coverage"
```
