"""Tests for the database seeder."""

import pytest
from sqlalchemy import func, select

from app.models import (
    Actividad,
    Asistencia,
    DiaSemana,
    EstadoInscripcion,
    EvaluacionSalud,
    Inscripcion,
    ListaEspera,
    Notificacion,
    Plan,
    RolUsuario,
    Turno,
    Usuario,
)
from app.seed import seed

# Re-use the test engine/session from conftest
from app.tests.conftest import async_session_test, engine_test

# Patch seed to use test database
from app.core import database as db_module


@pytest.fixture(autouse=True)
async def _patch_seed_db(monkeypatch):
    """Redirect seed() to use the test database engine and session."""
    monkeypatch.setattr(db_module, "engine", engine_test)
    monkeypatch.setattr(db_module, "async_session", async_session_test)


@pytest.fixture
async def seeded_db(db_session):
    """Run seed and return a session with data."""
    await seed()
    return db_session


@pytest.mark.asyncio
async def test_seed_creates_admin(seeded_db):
    result = await seeded_db.execute(
        select(Usuario).where(Usuario.rol == RolUsuario.ADMIN)
    )
    admins = result.scalars().all()
    assert len(admins) == 1
    assert admins[0].email == "admin@hsp70.com"


@pytest.mark.asyncio
async def test_seed_creates_profesores(seeded_db):
    result = await seeded_db.execute(
        select(Usuario).where(Usuario.rol == RolUsuario.PROFESOR)
    )
    profesores = result.scalars().all()
    assert len(profesores) == 3


@pytest.mark.asyncio
async def test_seed_creates_recepcionistas(seeded_db):
    result = await seeded_db.execute(
        select(Usuario).where(Usuario.rol == RolUsuario.RECEPCIONISTA)
    )
    recepcionistas = result.scalars().all()
    assert len(recepcionistas) == 2


@pytest.mark.asyncio
async def test_seed_creates_alumnos(seeded_db):
    result = await seeded_db.execute(
        select(Usuario).where(Usuario.rol == RolUsuario.ALUMNO)
    )
    alumnos = result.scalars().all()
    assert len(alumnos) == 15


@pytest.mark.asyncio
async def test_seed_creates_seven_actividades(seeded_db):
    result = await seeded_db.execute(select(Actividad))
    actividades = result.scalars().all()
    assert len(actividades) == 7
    nombres = {a.nombre for a in actividades}
    assert "Pilates Reformer" in nombres
    assert "Nutrición Deportiva" in nombres


@pytest.mark.asyncio
async def test_seed_creates_three_plans(seeded_db):
    result = await seeded_db.execute(select(Plan))
    planes = result.scalars().all()
    assert len(planes) == 3
    nombres = {p.nombre for p in planes}
    assert nombres == {"Básico", "Intermedio", "Premium"}


@pytest.mark.asyncio
async def test_seed_creates_turnos_lv(seeded_db):
    """Turnos should only be on weekdays (L-V)."""
    result = await seeded_db.execute(select(Turno))
    turnos = result.scalars().all()
    assert len(turnos) > 0
    weekend = {DiaSemana.SABADO, DiaSemana.DOMINGO}
    for turno in turnos:
        assert turno.dia_semana not in weekend


@pytest.mark.asyncio
async def test_seed_creates_turnos_realistic_hours(seeded_db):
    """All shifts should be between 8:00 and 20:00."""
    from datetime import time

    result = await seeded_db.execute(select(Turno))
    turnos = result.scalars().all()
    for turno in turnos:
        assert turno.hora_inicio >= time(8, 0)
        assert turno.hora_inicio <= time(20, 0)


@pytest.mark.asyncio
async def test_seed_has_active_enrollments(seeded_db):
    result = await seeded_db.execute(
        select(Inscripcion).where(Inscripcion.estado == EstadoInscripcion.ACTIVA)
    )
    assert len(result.scalars().all()) >= 10


@pytest.mark.asyncio
async def test_seed_has_cancelled_enrollments(seeded_db):
    result = await seeded_db.execute(
        select(Inscripcion).where(Inscripcion.estado == EstadoInscripcion.CANCELADA)
    )
    assert len(result.scalars().all()) >= 1


@pytest.mark.asyncio
async def test_seed_has_waitlist_entries(seeded_db):
    result = await seeded_db.execute(select(ListaEspera))
    entries = result.scalars().all()
    assert len(entries) >= 2


@pytest.mark.asyncio
async def test_seed_has_attendance_records(seeded_db):
    result = await seeded_db.execute(select(func.count(Asistencia.id)))
    count = result.scalar()
    assert count > 0


@pytest.mark.asyncio
async def test_seed_has_health_evaluations(seeded_db):
    result = await seeded_db.execute(select(EvaluacionSalud))
    evals = result.scalars().all()
    assert len(evals) >= 5
    for ev in evals:
        assert ev.imc is not None
        assert ev.peso_kg is not None


@pytest.mark.asyncio
async def test_seed_has_notifications(seeded_db):
    result = await seeded_db.execute(select(func.count(Notificacion.id)))
    count = result.scalar()
    assert count > 0


@pytest.mark.asyncio
async def test_seed_is_idempotent(seeded_db):
    """Running seed twice should not duplicate data."""
    await seed()  # Second run
    result = await seeded_db.execute(
        select(func.count(Usuario.id))
    )
    count = result.scalar()
    assert count == 21  # 1 admin + 3 prof + 2 recep + 15 alumnos
