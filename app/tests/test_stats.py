"""Tests for admin dashboard stats endpoint."""

from datetime import date, time, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models.actividad import Actividad
from app.models.enums import (
    DiaSemana,
    EstadoInscripcion,
    EstadoPago,
    MetodoPago,
    RolUsuario,
)
from app.models.inscripcion import Inscripcion
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.turno import Turno
from app.models.usuario import Usuario
from app.services.stats_service import WEEKDAY_MAP


# ── Helpers ──────────────────────────────────────────────────────

_user_counter = 100_000  # avoid collision with other test modules


async def _create_user(db, *, email, rol=RolUsuario.ALUMNO, nombre="Test", apellido="User"):
    global _user_counter
    _user_counter += 1
    user = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        password_hash=hash_password("testpassword"),
        rol=rol,
        dni=f"{_user_counter:08d}",
        telefono="555-0000",
        fecha_nacimiento=date(2000, 1, 1),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _create_admin(db):
    return await _create_user(
        db, email="stats_admin@test.com", rol=RolUsuario.ADMIN,
        nombre="Admin", apellido="Stats",
    )


async def _create_alumno(db, *, email="stats_alumno@test.com"):
    return await _create_user(db, email=email, rol=RolUsuario.ALUMNO)


async def _create_profesor(db, *, email="stats_prof@test.com"):
    return await _create_user(db, email=email, rol=RolUsuario.PROFESOR)


async def _create_actividad(db, *, nombre="Yoga Stats"):
    act = Actividad(
        nombre=nombre, descripcion="Test", cupo_maximo=20,
        duracion_min=60, activa=True,
    )
    db.add(act)
    await db.commit()
    await db.refresh(act)
    return act


async def _create_plan(db, *, nombre="Plan Stats"):
    plan = Plan(
        nombre=nombre, descripcion="Test plan",
        precio=5000, duracion_dias=30, max_actividades=2,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def _create_turno(db, *, actividad_id, profesor_id, dia=DiaSemana.LUNES):
    turno = Turno(
        actividad_id=actividad_id, profesor_id=profesor_id,
        dia_semana=dia, hora_inicio=time(9, 0), hora_fin=time(10, 0),
        sala="Sala A", activo=True,
    )
    db.add(turno)
    await db.commit()
    await db.refresh(turno)
    return turno


async def _create_pago(db, *, alumno_id, plan_id, estado=EstadoPago.APROBADO, days_offset=0):
    pago = Pago(
        alumno_id=alumno_id, plan_id=plan_id, monto=5000,
        fecha_vencimiento=date.today() + timedelta(days=days_offset),
        estado=estado, metodo_pago=MetodoPago.EFECTIVO,
    )
    db.add(pago)
    await db.commit()
    await db.refresh(pago)
    return pago


async def _create_inscripcion(db, *, alumno_id, turno_id, estado=EstadoInscripcion.ACTIVA):
    ins = Inscripcion(
        alumno_id=alumno_id, turno_id=turno_id, estado=estado,
    )
    db.add(ins)
    await db.commit()
    await db.refresh(ins)
    return ins


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


# ── Tests ────────────────────────────────────────────────────────


class TestDashboardStatsAuth:
    """Authorization and authentication checks."""

    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        r = await client.get("/api/stats/dashboard")
        assert r.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_non_admin_forbidden(self, client, db_session):
        alumno = await _create_alumno(db_session)
        r = await client.get("/api/stats/dashboard", headers=_auth(alumno))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_profesor_forbidden(self, client, db_session):
        prof = await _create_profesor(db_session)
        r = await client.get("/api/stats/dashboard", headers=_auth(prof))
        assert r.status_code == 403


class TestDashboardStatsEmpty:
    """Empty database returns all zeroes."""

    @pytest.mark.asyncio
    async def test_empty_database(self, client, db_session):
        admin = await _create_admin(db_session)
        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["total_alumnos"] == 0
        assert data["alumnos_activos"] == 0
        assert data["total_profesores"] == 0
        assert data["total_actividades"] == 0
        assert data["turnos_hoy"] == 0
        assert data["pagos_pendientes"] == 0
        assert data["pagos_vencidos"] == 0
        assert data["ingresos_mes"] == 0.0
        assert data["inscripciones_activas"] == 0


class TestDashboardStatsWithData:
    """Verify each stat with seeded data."""

    @pytest.mark.asyncio
    async def test_counts_users_by_role(self, client, db_session):
        admin = await _create_admin(db_session)
        await _create_alumno(db_session, email="s1@test.com")
        await _create_alumno(db_session, email="s2@test.com")
        await _create_profesor(db_session, email="p1@test.com")

        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        data = r.json()
        assert data["total_alumnos"] == 2
        assert data["total_profesores"] == 1

    @pytest.mark.asyncio
    async def test_alumnos_activos(self, client, db_session):
        admin = await _create_admin(db_session)
        plan = await _create_plan(db_session)
        a1 = await _create_alumno(db_session, email="active1@test.com")
        a2 = await _create_alumno(db_session, email="active2@test.com")
        a3 = await _create_alumno(db_session, email="expired@test.com")

        # a1: approved, not expired
        await _create_pago(db_session, alumno_id=a1.id, plan_id=plan.id,
                           estado=EstadoPago.APROBADO, days_offset=15)
        # a2: approved, not expired
        await _create_pago(db_session, alumno_id=a2.id, plan_id=plan.id,
                           estado=EstadoPago.APROBADO, days_offset=10)
        # a3: approved but expired
        await _create_pago(db_session, alumno_id=a3.id, plan_id=plan.id,
                           estado=EstadoPago.APROBADO, days_offset=-5)

        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        data = r.json()
        assert data["alumnos_activos"] == 2

    @pytest.mark.asyncio
    async def test_total_actividades(self, client, db_session):
        admin = await _create_admin(db_session)
        await _create_actividad(db_session, nombre="Act1")
        await _create_actividad(db_session, nombre="Act2")
        # Inactive should not count
        inactive = Actividad(
            nombre="Inactive", descripcion="", cupo_maximo=10,
            duracion_min=30, activa=False,
        )
        db_session.add(inactive)
        await db_session.commit()

        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        data = r.json()
        assert data["total_actividades"] == 2

    @pytest.mark.asyncio
    async def test_turnos_hoy(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)

        today_dia = WEEKDAY_MAP[date.today().weekday()]
        # Turno for today
        await _create_turno(db_session, actividad_id=act.id,
                            profesor_id=prof.id, dia=today_dia)
        # Turno for a different day
        other_dia = WEEKDAY_MAP[(date.today().weekday() + 1) % 7]
        await _create_turno(db_session, actividad_id=act.id,
                            profesor_id=prof.id, dia=other_dia)

        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        data = r.json()
        assert data["turnos_hoy"] == 1

    @pytest.mark.asyncio
    async def test_pagos_pendientes_y_vencidos(self, client, db_session):
        admin = await _create_admin(db_session)
        alumno = await _create_alumno(db_session)
        plan = await _create_plan(db_session)

        await _create_pago(db_session, alumno_id=alumno.id, plan_id=plan.id,
                           estado=EstadoPago.PENDIENTE)
        await _create_pago(db_session, alumno_id=alumno.id, plan_id=plan.id,
                           estado=EstadoPago.PENDIENTE)
        await _create_pago(db_session, alumno_id=alumno.id, plan_id=plan.id,
                           estado=EstadoPago.VENCIDO)

        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        data = r.json()
        assert data["pagos_pendientes"] == 2
        assert data["pagos_vencidos"] == 1

    @pytest.mark.asyncio
    async def test_ingresos_mes(self, client, db_session):
        admin = await _create_admin(db_session)
        alumno = await _create_alumno(db_session)
        plan = await _create_plan(db_session)

        # Approved payment this month (created now via server_default)
        await _create_pago(db_session, alumno_id=alumno.id, plan_id=plan.id,
                           estado=EstadoPago.APROBADO, days_offset=15)

        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        data = r.json()
        assert data["ingresos_mes"] == 5000.0

    @pytest.mark.asyncio
    async def test_inscripciones_activas(self, client, db_session):
        admin = await _create_admin(db_session)
        alumno = await _create_alumno(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno1 = await _create_turno(db_session, actividad_id=act.id,
                                     profesor_id=prof.id, dia=DiaSemana.LUNES)
        turno2 = await _create_turno(db_session, actividad_id=act.id,
                                     profesor_id=prof.id, dia=DiaSemana.MARTES)

        await _create_inscripcion(db_session, alumno_id=alumno.id,
                                  turno_id=turno1.id)
        await _create_inscripcion(db_session, alumno_id=alumno.id,
                                  turno_id=turno2.id,
                                  estado=EstadoInscripcion.CANCELADA)

        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        data = r.json()
        assert data["inscripciones_activas"] == 1

    @pytest.mark.asyncio
    async def test_response_schema(self, client, db_session):
        """All expected fields are present in the response."""
        admin = await _create_admin(db_session)
        r = await client.get("/api/stats/dashboard", headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        expected_keys = {
            "total_alumnos", "alumnos_activos", "total_profesores",
            "total_actividades", "turnos_hoy", "pagos_pendientes",
            "pagos_vencidos", "ingresos_mes", "inscripciones_activas",
        }
        assert set(data.keys()) == expected_keys
