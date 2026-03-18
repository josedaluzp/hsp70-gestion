from datetime import date, time, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models.actividad import Actividad
from app.models.asistencia import Asistencia
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


async def _create_inscripcion(db, *, alumno_id, turno_id):
    inscripcion = Inscripcion(
        alumno_id=alumno_id,
        turno_id=turno_id,
        estado=EstadoInscripcion.ACTIVA,
    )
    db.add(inscripcion)
    await db.commit()
    await db.refresh(inscripcion)
    return inscripcion


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


# ── Test: POST /api/asistencias ──────────────────────────────────


class TestRegistrarAsistencia:
    @pytest.mark.asyncio
    async def test_profesor_registers_attendance(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        r = await client.post(
            "/api/asistencias",
            json={
                "inscripcion_id": inscripcion.id,
                "fecha": "2026-03-18",
                "presente": True,
            },
            headers=_auth(profesor),
        )
        assert r.status_code == 201
        data = r.json()
        assert data["inscripcion_id"] == inscripcion.id
        assert data["presente"] is True
        assert data["fecha"] == "2026-03-18"

    @pytest.mark.asyncio
    async def test_admin_registers_attendance(self, client, db_session):
        admin = await _create_admin(db_session)
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        r = await client.post(
            "/api/asistencias",
            json={
                "inscripcion_id": inscripcion.id,
                "fecha": "2026-03-18",
                "presente": True,
            },
            headers=_auth(admin),
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_recepcionista_registers_attendance(self, client, db_session):
        recep = await _create_recepcionista(db_session)
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        r = await client.post(
            "/api/asistencias",
            json={
                "inscripcion_id": inscripcion.id,
                "fecha": "2026-03-18",
                "presente": False,
            },
            headers=_auth(recep),
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_wrong_profesor_cannot_register(self, client, db_session):
        """A professor not assigned to the shift cannot register attendance."""
        profesor1 = await _create_profesor(db_session, email="prof1@test.com")
        profesor2 = await _create_profesor(db_session, email="prof2@test.com")
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor1.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        r = await client.post(
            "/api/asistencias",
            json={
                "inscripcion_id": inscripcion.id,
                "fecha": "2026-03-18",
                "presente": True,
            },
            headers=_auth(profesor2),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_alumno_cannot_register_attendance(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        r = await client.post(
            "/api/asistencias",
            json={
                "inscripcion_id": inscripcion.id,
                "fecha": "2026-03-18",
                "presente": True,
            },
            headers=_auth(alumno),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_duplicate_attendance_rejected(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        payload = {
            "inscripcion_id": inscripcion.id,
            "fecha": "2026-03-18",
            "presente": True,
        }
        r = await client.post("/api/asistencias", json=payload, headers=_auth(profesor))
        assert r.status_code == 201

        r = await client.post("/api/asistencias", json=payload, headers=_auth(profesor))
        assert r.status_code == 409
        assert "already recorded" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_different_dates_allowed(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        r = await client.post(
            "/api/asistencias",
            json={"inscripcion_id": inscripcion.id, "fecha": "2026-03-18", "presente": True},
            headers=_auth(profesor),
        )
        assert r.status_code == 201

        r = await client.post(
            "/api/asistencias",
            json={"inscripcion_id": inscripcion.id, "fecha": "2026-03-19", "presente": False},
            headers=_auth(profesor),
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_inscription_not_found(self, client, db_session):
        profesor = await _create_profesor(db_session)

        r = await client.post(
            "/api/asistencias",
            json={"inscripcion_id": 999, "fecha": "2026-03-18", "presente": True},
            headers=_auth(profesor),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_cancelled_inscription_rejected(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = Inscripcion(
            alumno_id=alumno.id,
            turno_id=turno.id,
            estado=EstadoInscripcion.CANCELADA,
        )
        db_session.add(inscripcion)
        await db_session.commit()
        await db_session.refresh(inscripcion)

        r = await client.post(
            "/api/asistencias",
            json={"inscripcion_id": inscripcion.id, "fecha": "2026-03-18", "presente": True},
            headers=_auth(profesor),
        )
        assert r.status_code == 400
        assert "not active" in r.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_with_observacion(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        r = await client.post(
            "/api/asistencias",
            json={
                "inscripcion_id": inscripcion.id,
                "fecha": "2026-03-18",
                "presente": False,
                "observacion": "Arrived late, did not participate",
            },
            headers=_auth(profesor),
        )
        assert r.status_code == 201
        assert r.json()["observacion"] == "Arrived late, did not participate"

    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        r = await client.post(
            "/api/asistencias",
            json={"inscripcion_id": 1, "fecha": "2026-03-18", "presente": True},
        )
        assert r.status_code in (401, 403)


# ── Test: GET /api/turnos/{id}/asistencias ───────────────────────


class TestListarAsistenciasTurno:
    @pytest.mark.asyncio
    async def test_list_attendance_for_date(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        # Record attendance
        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=True,
        )
        db_session.add(asistencia)
        await db_session.commit()

        r = await client.get(
            f"/api/turnos/{turno.id}/asistencias",
            params={"fecha": "2026-03-18"},
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["presente"] is True
        assert data["items"][0]["alumno_id"] == alumno.id
        assert data["items"][0]["nombre_alumno"] is not None

    @pytest.mark.asyncio
    async def test_list_empty_for_different_date(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=True,
        )
        db_session.add(asistencia)
        await db_session.commit()

        r = await client.get(
            f"/api/turnos/{turno.id}/asistencias",
            params={"fecha": "2026-03-19"},
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        assert r.json()["total"] == 0

    @pytest.mark.asyncio
    async def test_turno_not_found(self, client, db_session):
        profesor = await _create_profesor(db_session)

        r = await client.get(
            "/api/turnos/999/asistencias",
            params={"fecha": "2026-03-18"},
            headers=_auth(profesor),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_alumno_cannot_list_turno_attendance(self, client, db_session):
        alumno = await _create_alumno(db_session)
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.get(
            f"/api/turnos/{turno.id}/asistencias",
            params={"fecha": "2026-03-18"},
            headers=_auth(alumno),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_list(self, client, db_session):
        admin = await _create_admin(db_session)
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.get(
            f"/api/turnos/{turno.id}/asistencias",
            params={"fecha": "2026-03-18"},
            headers=_auth(admin),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_requires_fecha_param(self, client, db_session):
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.get(
            f"/api/turnos/{turno.id}/asistencias",
            headers=_auth(profesor),
        )
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_requires_auth(self, client, db_session):
        profesor = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)

        r = await client.get(
            f"/api/turnos/{turno.id}/asistencias",
            params={"fecha": "2026-03-18"},
        )
        assert r.status_code in (401, 403)


# ── Test: GET /api/alumnos/{id}/asistencias ──────────────────────


class TestListarAsistenciasAlumno:
    @pytest.mark.asyncio
    async def test_alumno_views_own_history(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        for i in range(3):
            db_session.add(
                Asistencia(
                    inscripcion_id=inscripcion.id,
                    fecha=date(2026, 3, 18) + timedelta(days=i),
                    presente=i % 2 == 0,
                )
            )
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/asistencias",
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 3

    @pytest.mark.asyncio
    async def test_date_filter_desde(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        for i in range(5):
            db_session.add(
                Asistencia(
                    inscripcion_id=inscripcion.id,
                    fecha=date(2026, 3, 15) + timedelta(days=i),
                    presente=True,
                )
            )
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/asistencias",
            params={"fecha_desde": "2026-03-18"},
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        assert r.json()["total"] == 2  # Mar 18, Mar 19

    @pytest.mark.asyncio
    async def test_date_filter_hasta(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        for i in range(5):
            db_session.add(
                Asistencia(
                    inscripcion_id=inscripcion.id,
                    fecha=date(2026, 3, 15) + timedelta(days=i),
                    presente=True,
                )
            )
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/asistencias",
            params={"fecha_hasta": "2026-03-16"},
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        assert r.json()["total"] == 2  # Mar 15, Mar 16

    @pytest.mark.asyncio
    async def test_date_filter_range(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        for i in range(5):
            db_session.add(
                Asistencia(
                    inscripcion_id=inscripcion.id,
                    fecha=date(2026, 3, 15) + timedelta(days=i),
                    presente=True,
                )
            )
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/asistencias",
            params={"fecha_desde": "2026-03-16", "fecha_hasta": "2026-03-18"},
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        assert r.json()["total"] == 3  # Mar 16, 17, 18

    @pytest.mark.asyncio
    async def test_another_alumno_forbidden(self, client, db_session):
        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        alumno2 = await _create_alumno(db_session, email="a2@test.com")

        r = await client.get(
            f"/api/alumnos/{alumno1.id}/asistencias",
            headers=_auth(alumno2),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_view_any(self, client, db_session):
        admin = await _create_admin(db_session)
        alumno = await _create_alumno(db_session)

        r = await client.get(
            f"/api/alumnos/{alumno.id}/asistencias",
            headers=_auth(admin),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_profesor_can_view_any(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        r = await client.get(
            f"/api/alumnos/{alumno.id}/asistencias",
            headers=_auth(profesor),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_recepcionista_can_view_any(self, client, db_session):
        recep = await _create_recepcionista(db_session)
        alumno = await _create_alumno(db_session)

        r = await client.get(
            f"/api/alumnos/{alumno.id}/asistencias",
            headers=_auth(recep),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        r = await client.get("/api/alumnos/1/asistencias")
        assert r.status_code in (401, 403)


# ── Test: PUT /api/asistencias/{id} ──────────────────────────────


class TestActualizarAsistencia:
    @pytest.mark.asyncio
    async def test_profesor_updates_attendance(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=False,
        )
        db_session.add(asistencia)
        await db_session.commit()
        await db_session.refresh(asistencia)

        r = await client.put(
            f"/api/asistencias/{asistencia.id}",
            json={"presente": True, "observacion": "Corrected"},
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["presente"] is True
        assert data["observacion"] == "Corrected"

    @pytest.mark.asyncio
    async def test_partial_update_presente_only(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=False,
            observacion="Original note",
        )
        db_session.add(asistencia)
        await db_session.commit()
        await db_session.refresh(asistencia)

        r = await client.put(
            f"/api/asistencias/{asistencia.id}",
            json={"presente": True},
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        assert r.json()["presente"] is True
        assert r.json()["observacion"] == "Original note"

    @pytest.mark.asyncio
    async def test_wrong_profesor_cannot_update(self, client, db_session):
        profesor1 = await _create_profesor(db_session, email="prof1@test.com")
        profesor2 = await _create_profesor(db_session, email="prof2@test.com")
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor1.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=False,
        )
        db_session.add(asistencia)
        await db_session.commit()
        await db_session.refresh(asistencia)

        r = await client.put(
            f"/api/asistencias/{asistencia.id}",
            json={"presente": True},
            headers=_auth(profesor2),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_admin_can_update(self, client, db_session):
        admin = await _create_admin(db_session)
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=False,
        )
        db_session.add(asistencia)
        await db_session.commit()
        await db_session.refresh(asistencia)

        r = await client.put(
            f"/api/asistencias/{asistencia.id}",
            json={"presente": True},
            headers=_auth(admin),
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_alumno_cannot_update(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(db_session, actividad_id=act.id, profesor_id=profesor.id)
        inscripcion = await _create_inscripcion(db_session, alumno_id=alumno.id, turno_id=turno.id)

        asistencia = Asistencia(
            inscripcion_id=inscripcion.id,
            fecha=date(2026, 3, 18),
            presente=False,
        )
        db_session.add(asistencia)
        await db_session.commit()
        await db_session.refresh(asistencia)

        r = await client.put(
            f"/api/asistencias/{asistencia.id}",
            json={"presente": True},
            headers=_auth(alumno),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_not_found(self, client, db_session):
        profesor = await _create_profesor(db_session)
        r = await client.put(
            "/api/asistencias/999",
            json={"presente": True},
            headers=_auth(profesor),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        r = await client.put("/api/asistencias/1", json={"presente": True})
        assert r.status_code in (401, 403)
