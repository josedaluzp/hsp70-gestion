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
from app.models.lista_espera import ListaEspera
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.turno import Turno
from app.models.usuario import Usuario


# ── Helpers ──────────────────────────────────────────────────────


async def _create_user(db, *, email, rol=RolUsuario.ALUMNO, nombre="Test", apellido="User"):
    user = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        password_hash=hash_password("testpassword"),
        rol=rol,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def _create_admin(db):
    return await _create_user(db, email="admin@test.com", rol=RolUsuario.ADMIN, nombre="Admin")


async def _create_alumno(db, *, email="alumno@test.com", nombre="Alumno"):
    return await _create_user(db, email=email, rol=RolUsuario.ALUMNO, nombre=nombre)


async def _create_profesor(db, *, email="profesor@test.com"):
    return await _create_user(db, email=email, rol=RolUsuario.PROFESOR, nombre="Profesor")


async def _create_recepcionista(db, *, email="recep@test.com"):
    return await _create_user(db, email=email, rol=RolUsuario.RECEPCIONISTA, nombre="Recep")


async def _create_actividad(db, *, nombre="Yoga", cupo_maximo=20):
    act = Actividad(
        nombre=nombre,
        descripcion="Test activity",
        cupo_maximo=cupo_maximo,
        duracion_min=60,
        activa=True,
    )
    db.add(act)
    await db.commit()
    await db.refresh(act)
    return act


async def _create_turno(db, *, actividad_id, profesor_id, dia=DiaSemana.LUNES):
    turno = Turno(
        actividad_id=actividad_id,
        profesor_id=profesor_id,
        dia_semana=dia,
        hora_inicio=time(9, 0),
        hora_fin=time(10, 0),
        sala="Sala A",
        activo=True,
    )
    db.add(turno)
    await db.commit()
    await db.refresh(turno)
    return turno


async def _create_plan(db, *, nombre="Plan Básico", max_actividades=2, precio=5000):
    plan = Plan(
        nombre=nombre,
        descripcion="Test plan",
        precio=precio,
        duracion_dias=30,
        max_actividades=max_actividades,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def _create_membership(db, *, alumno_id, plan_id, days_remaining=30):
    pago = Pago(
        alumno_id=alumno_id,
        plan_id=plan_id,
        monto=5000,
        fecha_vencimiento=date.today() + timedelta(days=days_remaining),
        estado=EstadoPago.APROBADO,
        metodo_pago=MetodoPago.EFECTIVO,
    )
    db.add(pago)
    await db.commit()
    await db.refresh(pago)
    return pago


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


# ── Test: POST /api/inscripciones ────────────────────────────────


class TestCrearInscripcion:
    @pytest.mark.asyncio
    async def test_enroll_success(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 201
        data = r.json()
        assert data["alumno_id"] == alumno.id
        assert data["turno_id"] == turno.id
        assert data["lista_espera"] is False

    @pytest.mark.asyncio
    async def test_enroll_no_membership(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 400
        assert "active membership" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_enroll_expired_membership(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id, days_remaining=-1)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 400
        assert "active membership" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_enroll_already_enrolled(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        # First enrollment
        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 201

        # Second enrollment - should fail
        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 409
        assert "already enrolled" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_enroll_turno_not_found(self, client, db_session):
        alumno = await _create_alumno(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": 999},
            headers=_auth(alumno),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_enroll_turno_inactive(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = Turno(
            actividad_id=act.id,
            profesor_id=profesor.id,
            dia_semana=DiaSemana.LUNES,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
            sala="Sala A",
            activo=False,
        )
        db_session.add(turno)
        await db_session.commit()
        await db_session.refresh(turno)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 400
        assert "not active" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_enroll_max_actividades_exceeded(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session, max_actividades=1)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)

        act1 = await _create_actividad(db_session, nombre="Yoga")
        act2 = await _create_actividad(db_session, nombre="Pilates")
        turno1 = await _create_turno(db_session, actividad_id=act1.id, profesor_id=profesor.id)
        turno2 = await _create_turno(
            db_session, actividad_id=act2.id, profesor_id=profesor.id, dia=DiaSemana.MARTES
        )

        # Enroll in first activity
        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno1.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 201

        # Enroll in second activity - should fail (max 1)
        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno2.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 400
        assert "maximum" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_enroll_same_activity_different_turno_allowed(self, client, db_session):
        """Multiple turnos of the same activity don't count as extra activities."""
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session, max_actividades=1)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)

        act = await _create_actividad(db_session, nombre="Yoga", cupo_maximo=20)
        turno1 = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        turno2 = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=profesor.id, dia=DiaSemana.MARTES
        )

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno1.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 201

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno2.id},
            headers=_auth(alumno),
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_enroll_no_cupo_waitlist(self, client, db_session):
        """When no cupo, student is added to waitlist."""
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session, max_actividades=3)
        act = await _create_actividad(db_session, cupo_maximo=1)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        # Fill the single spot
        alumno1 = await _create_alumno(db_session, email="a1@test.com", nombre="A1")
        await _create_membership(db_session, alumno_id=alumno1.id, plan_id=plan.id)
        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno1),
        )
        assert r.status_code == 201

        # Second student → waitlist
        alumno2 = await _create_alumno(db_session, email="a2@test.com", nombre="A2")
        await _create_membership(db_session, alumno_id=alumno2.id, plan_id=plan.id)
        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno2),
        )
        assert r.status_code == 201
        data = r.json()
        assert data["lista_espera"] is True
        assert data["posicion"] == 1

    @pytest.mark.asyncio
    async def test_enroll_already_on_waitlist(self, client, db_session):
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session, max_actividades=3)
        act = await _create_actividad(db_session, cupo_maximo=1)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        # Fill spot
        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        await _create_membership(db_session, alumno_id=alumno1.id, plan_id=plan.id)
        await client.post("/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno1))

        # Waitlist
        alumno2 = await _create_alumno(db_session, email="a2@test.com")
        await _create_membership(db_session, alumno_id=alumno2.id, plan_id=plan.id)
        await client.post("/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno2))

        # Try again → conflict
        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno2),
        )
        assert r.status_code == 409
        assert "waitlist" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_enroll_requires_auth(self, client):
        r = await client.post("/api/inscripciones", json={"turno_id": 1})
        assert r.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_admin_enrolls_another_student(self, client, db_session):
        admin = await _create_admin(db_session)
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id, "alumno_id": alumno.id},
            headers=_auth(admin),
        )
        assert r.status_code == 201
        assert r.json()["alumno_id"] == alumno.id

    @pytest.mark.asyncio
    async def test_alumno_cannot_enroll_another(self, client, db_session):
        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        alumno2 = await _create_alumno(db_session, email="a2@test.com")
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno2.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id, "alumno_id": alumno2.id},
            headers=_auth(alumno1),
        )
        assert r.status_code == 403


# ── Test: DELETE /api/inscripciones/{id} ─────────────────────────


class TestCancelarInscripcion:
    @pytest.mark.asyncio
    async def test_cancel_own_enrollment(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones",
            json={"turno_id": turno.id},
            headers=_auth(alumno),
        )
        inscripcion_id = r.json()["id"]

        r = await client.delete(
            f"/api/inscripciones/{inscripcion_id}",
            headers=_auth(alumno),
        )
        assert r.status_code == 204

    @pytest.mark.asyncio
    async def test_cancel_already_cancelled(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno)
        )
        inscripcion_id = r.json()["id"]
        await client.delete(f"/api/inscripciones/{inscripcion_id}", headers=_auth(alumno))

        r = await client.delete(
            f"/api/inscripciones/{inscripcion_id}", headers=_auth(alumno)
        )
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_cancel_not_found(self, client, db_session):
        alumno = await _create_alumno(db_session)
        r = await client.delete("/api/inscripciones/999", headers=_auth(alumno))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_cancel_another_students_enrollment_forbidden(self, client, db_session):
        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        alumno2 = await _create_alumno(db_session, email="a2@test.com")
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno1.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno1)
        )
        inscripcion_id = r.json()["id"]

        r = await client.delete(
            f"/api/inscripciones/{inscripcion_id}", headers=_auth(alumno2)
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_cancel_any(self, client, db_session):
        alumno = await _create_alumno(db_session)
        admin = await _create_admin(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno)
        )
        inscripcion_id = r.json()["id"]

        r = await client.delete(
            f"/api/inscripciones/{inscripcion_id}", headers=_auth(admin)
        )
        assert r.status_code == 204

    @pytest.mark.asyncio
    async def test_recepcionista_can_cancel_any(self, client, db_session):
        alumno = await _create_alumno(db_session)
        recep = await _create_recepcionista(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno)
        )
        inscripcion_id = r.json()["id"]

        r = await client.delete(
            f"/api/inscripciones/{inscripcion_id}", headers=_auth(recep)
        )
        assert r.status_code == 204

    @pytest.mark.asyncio
    async def test_cancel_promotes_waitlist(self, client, db_session):
        """Cancelling frees a spot and promotes the first waitlisted student."""
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session, max_actividades=3)
        act = await _create_actividad(db_session, cupo_maximo=1)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        alumno2 = await _create_alumno(db_session, email="a2@test.com")
        await _create_membership(db_session, alumno_id=alumno1.id, plan_id=plan.id)
        await _create_membership(db_session, alumno_id=alumno2.id, plan_id=plan.id)

        # alumno1 enrolls (fills cupo)
        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno1)
        )
        inscripcion_id = r.json()["id"]

        # alumno2 goes to waitlist
        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno2)
        )
        assert r.json()["lista_espera"] is True

        # alumno1 cancels
        r = await client.delete(
            f"/api/inscripciones/{inscripcion_id}", headers=_auth(alumno1)
        )
        assert r.status_code == 204

        # Check alumno2 was promoted (has active inscription)
        from sqlalchemy import select

        from app.tests.conftest import async_session_test

        async with async_session_test() as session:
            result = await session.execute(
                select(Inscripcion).where(
                    Inscripcion.alumno_id == alumno2.id,
                    Inscripcion.turno_id == turno.id,
                    Inscripcion.estado == EstadoInscripcion.ACTIVA,
                )
            )
            promoted = result.scalar_one_or_none()
            assert promoted is not None

            # Check waitlist is empty
            result = await session.execute(
                select(ListaEspera).where(ListaEspera.turno_id == turno.id)
            )
            assert result.scalar_one_or_none() is None

    @pytest.mark.asyncio
    async def test_cancel_requires_auth(self, client):
        r = await client.delete("/api/inscripciones/1")
        assert r.status_code in (401, 403)


# ── Test: GET /api/turnos/{id}/inscritos ─────────────────────────


class TestListarInscritos:
    @pytest.mark.asyncio
    async def test_list_inscritos(self, client, db_session):
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        alumno = await _create_alumno(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno)
        )

        r = await client.get(
            f"/api/turnos/{turno.id}/inscritos",
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["alumno_id"] == alumno.id
        assert data["items"][0]["nombre_alumno"] is not None

    @pytest.mark.asyncio
    async def test_list_inscritos_excludes_cancelled(self, client, db_session):
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        alumno = await _create_alumno(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno)
        )
        inscripcion_id = r.json()["id"]
        await client.delete(f"/api/inscripciones/{inscripcion_id}", headers=_auth(alumno))

        r = await client.get(
            f"/api/turnos/{turno.id}/inscritos",
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        assert r.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_list_inscritos_turno_not_found(self, client, db_session):
        profesor = await _create_profesor(db_session)
        r = await client.get("/api/turnos/999/inscritos", headers=_auth(profesor))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_list_inscritos_requires_role(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.get(
            f"/api/turnos/{turno.id}/inscritos",
            headers=_auth(alumno),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_list_inscritos_admin_allowed(self, client, db_session):
        admin = await _create_admin(db_session)
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.get(
            f"/api/turnos/{turno.id}/inscritos",
            headers=_auth(admin),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_list_inscritos_requires_auth(self, client, db_session):
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.get(f"/api/turnos/{turno.id}/inscritos")
        assert r.status_code in (401, 403)


# ── Test: GET /api/alumnos/{id}/inscripciones ────────────────────


class TestListarInscripcionesAlumno:
    @pytest.mark.asyncio
    async def test_list_own_inscripciones(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno)
        )

        r = await client.get(
            f"/api/alumnos/{alumno.id}/inscripciones",
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["nombre_actividad"] == "Yoga"

    @pytest.mark.asyncio
    async def test_list_filter_solo_activas(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session)
        await _create_membership(db_session, alumno_id=alumno.id, plan_id=plan.id)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.post(
            "/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(alumno)
        )
        inscripcion_id = r.json()["id"]
        await client.delete(f"/api/inscripciones/{inscripcion_id}", headers=_auth(alumno))

        # All inscripciones (includes cancelled)
        r = await client.get(
            f"/api/alumnos/{alumno.id}/inscripciones",
            headers=_auth(alumno),
        )
        assert r.json()["total"] == 1

        # Only active
        r = await client.get(
            f"/api/alumnos/{alumno.id}/inscripciones",
            params={"solo_activas": True},
            headers=_auth(alumno),
        )
        assert r.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_list_another_students_inscripciones_forbidden(self, client, db_session):
        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        alumno2 = await _create_alumno(db_session, email="a2@test.com")

        r = await client.get(
            f"/api/alumnos/{alumno1.id}/inscripciones",
            headers=_auth(alumno2),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_view_any(self, client, db_session):
        alumno = await _create_alumno(db_session)
        admin = await _create_admin(db_session)

        r = await client.get(
            f"/api/alumnos/{alumno.id}/inscripciones",
            headers=_auth(admin),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client):
        r = await client.get("/api/alumnos/1/inscripciones")
        assert r.status_code in (401, 403)


# ── Test: Waitlist position recalculation ────────────────────────


class TestWaitlistPositions:
    @pytest.mark.asyncio
    async def test_waitlist_positions_sequential(self, client, db_session):
        """Multiple waitlisted students get sequential positions."""
        profesor = await _create_profesor(db_session)
        plan = await _create_plan(db_session, max_actividades=3)
        act = await _create_actividad(db_session, cupo_maximo=1)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        # Fill the spot
        a1 = await _create_alumno(db_session, email="a1@test.com")
        await _create_membership(db_session, alumno_id=a1.id, plan_id=plan.id)
        await client.post("/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(a1))

        # Waitlist student 2
        a2 = await _create_alumno(db_session, email="a2@test.com")
        await _create_membership(db_session, alumno_id=a2.id, plan_id=plan.id)
        r = await client.post("/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(a2))
        assert r.json()["posicion"] == 1

        # Waitlist student 3
        a3 = await _create_alumno(db_session, email="a3@test.com")
        await _create_membership(db_session, alumno_id=a3.id, plan_id=plan.id)
        r = await client.post("/api/inscripciones", json={"turno_id": turno.id}, headers=_auth(a3))
        assert r.json()["posicion"] == 2
