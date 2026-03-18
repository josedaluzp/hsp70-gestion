from datetime import time

import pytest

from app.core.security import create_access_token, hash_password
from app.models.actividad import Actividad
from app.models.enums import DiaSemana, EstadoInscripcion, RolUsuario
from app.models.inscripcion import Inscripcion
from app.models.turno import Turno
from app.models.usuario import Usuario

BASE = "/api/turnos"


async def _create_admin(db_session):
    user = Usuario(
        nombre="Admin",
        apellido="User",
        email="admin@test.com",
        password_hash=hash_password("testpassword"),
        rol=RolUsuario.ADMIN,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_alumno(db_session):
    user = Usuario(
        nombre="Alumno",
        apellido="User",
        email="alumno@test.com",
        password_hash=hash_password("testpassword"),
        rol=RolUsuario.ALUMNO,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_profesor(db_session, *, email="profesor@test.com"):
    user = Usuario(
        nombre="Profesor",
        apellido="User",
        email=email,
        password_hash=hash_password("testpassword"),
        rol=RolUsuario.PROFESOR,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_actividad(db_session, *, nombre="Yoga", activa=True, cupo_maximo=20):
    act = Actividad(
        nombre=nombre,
        descripcion="Test activity",
        cupo_maximo=cupo_maximo,
        duracion_min=60,
        activa=activa,
    )
    db_session.add(act)
    await db_session.commit()
    await db_session.refresh(act)
    return act


async def _create_turno(
    db_session,
    *,
    actividad_id,
    profesor_id,
    dia_semana=DiaSemana.LUNES,
    hora_inicio=time(9, 0),
    hora_fin=time(10, 0),
    sala="Sala A",
    activo=True,
):
    turno = Turno(
        actividad_id=actividad_id,
        profesor_id=profesor_id,
        dia_semana=dia_semana,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        sala=sala,
        activo=activo,
    )
    db_session.add(turno)
    await db_session.commit()
    await db_session.refresh(turno)
    return turno


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


class TestListTurnos:
    @pytest.mark.asyncio
    async def test_list_empty(self, client):
        r = await client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_returns_active_only(self, client, db_session):
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        await _create_turno(db_session, actividad_id=act.id, profesor_id=prof.id)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            dia_semana=DiaSemana.MARTES,
            activo=False,
        )

        r = await client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1

    @pytest.mark.asyncio
    async def test_list_filter_by_actividad(self, client, db_session):
        prof = await _create_profesor(db_session)
        act1 = await _create_actividad(db_session, nombre="Yoga")
        act2 = await _create_actividad(db_session, nombre="Pilates")
        await _create_turno(db_session, actividad_id=act1.id, profesor_id=prof.id)
        await _create_turno(
            db_session,
            actividad_id=act2.id,
            profesor_id=prof.id,
            dia_semana=DiaSemana.MARTES,
        )

        r = await client.get(BASE, params={"actividad_id": act1.id})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["actividad_id"] == act1.id

    @pytest.mark.asyncio
    async def test_list_filter_by_profesor(self, client, db_session):
        prof1 = await _create_profesor(db_session, email="prof1@test.com")
        prof2 = await _create_profesor(db_session, email="prof2@test.com")
        act = await _create_actividad(db_session)
        await _create_turno(db_session, actividad_id=act.id, profesor_id=prof1.id)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof2.id,
            dia_semana=DiaSemana.MARTES,
        )

        r = await client.get(BASE, params={"profesor_id": prof1.id})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["profesor_id"] == prof1.id

    @pytest.mark.asyncio
    async def test_list_filter_by_dia_semana(self, client, db_session):
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            dia_semana=DiaSemana.LUNES,
        )
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            dia_semana=DiaSemana.MIERCOLES,
            sala="Sala B",
        )

        r = await client.get(BASE, params={"dia_semana": "lunes"})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["dia_semana"] == "lunes"

    @pytest.mark.asyncio
    async def test_list_pagination(self, client, db_session):
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        for i, dia in enumerate(
            [DiaSemana.LUNES, DiaSemana.MARTES, DiaSemana.MIERCOLES,
             DiaSemana.JUEVES, DiaSemana.VIERNES]
        ):
            await _create_turno(
                db_session,
                actividad_id=act.id,
                profesor_id=prof.id,
                dia_semana=dia,
                sala=f"Sala {i}",
            )

        r = await client.get(BASE, params={"page": 1, "page_size": 2})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 5
        assert data["pages"] == 3
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_list_is_public(self, client, db_session):
        """No auth required for listing turnos."""
        r = await client.get(BASE)
        assert r.status_code == 200


class TestGetTurno:
    @pytest.mark.asyncio
    async def test_get_existing(self, client, db_session):
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session, cupo_maximo=20)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        r = await client.get(f"{BASE}/{turno.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == turno.id
        assert data["dia_semana"] == "lunes"
        assert data["inscritos"] == 0
        assert data["cupo_maximo"] == 20
        assert data["cupo_disponible"] == 20

    @pytest.mark.asyncio
    async def test_get_with_inscripciones(self, client, db_session):
        prof = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session, cupo_maximo=10)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        inscripcion = Inscripcion(
            alumno_id=alumno.id,
            turno_id=turno.id,
            estado=EstadoInscripcion.ACTIVA,
        )
        db_session.add(inscripcion)
        await db_session.commit()

        r = await client.get(f"{BASE}/{turno.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["inscritos"] == 1
        assert data["cupo_maximo"] == 10
        assert data["cupo_disponible"] == 9

    @pytest.mark.asyncio
    async def test_get_not_found(self, client):
        r = await client.get(f"{BASE}/999")
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_get_is_public(self, client, db_session):
        """No auth required for getting turno detail."""
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )
        r = await client.get(f"{BASE}/{turno.id}")
        assert r.status_code == 200


class TestCreateTurno:
    @pytest.mark.asyncio
    async def test_create_success(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof.id,
            "dia_semana": "lunes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
            "sala": "Sala A",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 201
        data = r.json()
        assert data["actividad_id"] == act.id
        assert data["profesor_id"] == prof.id
        assert data["activo"] is True
        assert data["id"] is not None

    @pytest.mark.asyncio
    async def test_create_hora_fin_before_inicio(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof.id,
            "dia_semana": "lunes",
            "hora_inicio": "10:00:00",
            "hora_fin": "09:00:00",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_actividad_not_found(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)

        payload = {
            "actividad_id": 999,
            "profesor_id": prof.id,
            "dia_semana": "lunes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_create_actividad_inactive(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session, activa=False)

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof.id,
            "dia_semana": "lunes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_create_profesor_not_found(self, client, db_session):
        admin = await _create_admin(db_session)
        act = await _create_actividad(db_session)

        payload = {
            "actividad_id": act.id,
            "profesor_id": 999,
            "dia_semana": "lunes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_create_user_not_profesor(self, client, db_session):
        admin = await _create_admin(db_session)
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)

        payload = {
            "actividad_id": act.id,
            "profesor_id": alumno.id,
            "dia_semana": "lunes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_create_profesor_overlap(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
        )

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof.id,
            "dia_semana": "lunes",
            "hora_inicio": "09:30:00",
            "hora_fin": "10:30:00",
            "sala": "Sala B",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_create_room_overlap(self, client, db_session):
        admin = await _create_admin(db_session)
        prof1 = await _create_profesor(db_session, email="prof1@test.com")
        prof2 = await _create_profesor(db_session, email="prof2@test.com")
        act = await _create_actividad(db_session)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof1.id,
            sala="Sala A",
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
        )

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof2.id,
            "dia_semana": "lunes",
            "hora_inicio": "09:30:00",
            "hora_fin": "10:30:00",
            "sala": "Sala A",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_create_no_overlap_different_day(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            dia_semana=DiaSemana.LUNES,
        )

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof.id,
            "dia_semana": "martes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
            "sala": "Sala A",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_create_no_overlap_adjacent_times(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
        )

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof.id,
            "dia_semana": "lunes",
            "hora_inicio": "10:00:00",
            "hora_fin": "11:00:00",
            "sala": "Sala B",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_create_requires_admin(self, client, db_session):
        alumno = await _create_alumno(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)

        payload = {
            "actividad_id": act.id,
            "profesor_id": prof.id,
            "dia_semana": "lunes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
        }
        r = await client.post(BASE, json=payload, headers=_auth(alumno))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client):
        payload = {
            "actividad_id": 1,
            "profesor_id": 1,
            "dia_semana": "lunes",
            "hora_inicio": "09:00:00",
            "hora_fin": "10:00:00",
        }
        r = await client.post(BASE, json=payload)
        assert r.status_code in (401, 403)


class TestUpdateTurno:
    @pytest.mark.asyncio
    async def test_update_success(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        payload = {"sala": "Sala B", "hora_inicio": "10:00:00", "hora_fin": "11:00:00"}
        r = await client.put(
            f"{BASE}/{turno.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["sala"] == "Sala B"
        assert data["hora_inicio"] == "10:00:00"

    @pytest.mark.asyncio
    async def test_update_partial(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id, sala="Sala A"
        )

        payload = {"sala": "Sala C"}
        r = await client.put(
            f"{BASE}/{turno.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["sala"] == "Sala C"
        assert data["dia_semana"] == "lunes"

    @pytest.mark.asyncio
    async def test_update_empty_body(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        r = await client.put(
            f"{BASE}/{turno.id}", json={}, headers=_auth(admin)
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_update_overlap(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
            sala="Sala A",
        )
        turno2 = await _create_turno(
            db_session,
            actividad_id=act.id,
            profesor_id=prof.id,
            dia_semana=DiaSemana.MARTES,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
            sala="Sala B",
        )

        # Move turno2 to Monday - should conflict with turno1
        payload = {"dia_semana": "lunes"}
        r = await client.put(
            f"{BASE}/{turno2.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_update_same_turno_no_self_overlap(self, client, db_session):
        """Updating a turno should not conflict with itself."""
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        payload = {"sala": "Sala B"}
        r = await client.put(
            f"{BASE}/{turno.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_update_not_found(self, client, db_session):
        admin = await _create_admin(db_session)
        r = await client.put(
            f"{BASE}/999", json={"sala": "X"}, headers=_auth(admin)
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_update_requires_admin(self, client, db_session):
        alumno = await _create_alumno(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        r = await client.put(
            f"{BASE}/{turno.id}",
            json={"sala": "Nope"},
            headers=_auth(alumno),
        )
        assert r.status_code == 403


class TestDeleteTurno:
    @pytest.mark.asyncio
    async def test_delete_soft(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        r = await client.delete(
            f"{BASE}/{turno.id}", headers=_auth(admin)
        )
        assert r.status_code == 204

        # Verify soft-deleted: not in active list
        r = await client.get(BASE)
        assert r.json()["total"] == 0

        # But still accessible by id
        r = await client.get(f"{BASE}/{turno.id}")
        assert r.status_code == 200
        assert r.json()["activo"] is False

    @pytest.mark.asyncio
    async def test_delete_already_inactive(self, client, db_session):
        admin = await _create_admin(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id, activo=False
        )

        r = await client.delete(
            f"{BASE}/{turno.id}", headers=_auth(admin)
        )
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_delete_not_found(self, client, db_session):
        admin = await _create_admin(db_session)
        r = await client.delete(f"{BASE}/999", headers=_auth(admin))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_requires_admin(self, client, db_session):
        alumno = await _create_alumno(db_session)
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )

        r = await client.delete(
            f"{BASE}/{turno.id}", headers=_auth(alumno)
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, client, db_session):
        prof = await _create_profesor(db_session)
        act = await _create_actividad(db_session)
        turno = await _create_turno(
            db_session, actividad_id=act.id, profesor_id=prof.id
        )
        r = await client.delete(f"{BASE}/{turno.id}")
        assert r.status_code in (401, 403)
