import pytest

from app.core.security import create_access_token, hash_password
from app.models.actividad import Actividad
from app.models.enums import DiaSemana, RolUsuario
from app.models.turno import Turno
from app.models.usuario import Usuario

BASE = "/api/actividades"


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


async def _create_actividad(db_session, *, nombre="Yoga", activa=True):
    act = Actividad(
        nombre=nombre,
        descripcion="Test activity",
        cupo_maximo=20,
        duracion_min=60,
        activa=activa,
    )
    db_session.add(act)
    await db_session.commit()
    await db_session.refresh(act)
    return act


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


class TestListActividades:
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
        await _create_actividad(db_session, nombre="Yoga", activa=True)
        await _create_actividad(db_session, nombre="Pilates", activa=False)

        r = await client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["nombre"] == "Yoga"

    @pytest.mark.asyncio
    async def test_list_filter_by_nombre(self, client, db_session):
        await _create_actividad(db_session, nombre="Yoga")
        await _create_actividad(db_session, nombre="Pilates")

        r = await client.get(BASE, params={"nombre": "yog"})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["nombre"] == "Yoga"

    @pytest.mark.asyncio
    async def test_list_pagination(self, client, db_session):
        for i in range(5):
            await _create_actividad(db_session, nombre=f"Act {i:02d}")

        r = await client.get(BASE, params={"page": 1, "page_size": 2})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 5
        assert data["pages"] == 3
        assert len(data["items"]) == 2
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_page_out_of_range(self, client, db_session):
        await _create_actividad(db_session, nombre="Yoga")

        r = await client.get(BASE, params={"page": 99})
        assert r.status_code == 200
        data = r.json()
        assert data["items"] == []
        assert data["total"] == 1

    @pytest.mark.asyncio
    async def test_list_is_public(self, client, db_session):
        """No auth required for listing activities."""
        await _create_actividad(db_session)
        r = await client.get(BASE)
        assert r.status_code == 200


class TestGetActividad:
    @pytest.mark.asyncio
    async def test_get_existing(self, client, db_session):
        act = await _create_actividad(db_session)
        r = await client.get(f"{BASE}/{act.id}")
        assert r.status_code == 200
        data = r.json()
        assert data["nombre"] == "Yoga"
        assert "turnos" in data

    @pytest.mark.asyncio
    async def test_get_with_turnos(self, client, db_session):
        act = await _create_actividad(db_session)
        admin = await _create_admin(db_session)
        from datetime import time

        turno = Turno(
            actividad_id=act.id,
            profesor_id=admin.id,
            dia_semana=DiaSemana.LUNES,
            hora_inicio=time(9, 0),
            hora_fin=time(10, 0),
            sala="Sala A",
        )
        db_session.add(turno)
        await db_session.commit()

        r = await client.get(f"{BASE}/{act.id}")
        assert r.status_code == 200
        data = r.json()
        assert len(data["turnos"]) == 1
        assert data["turnos"][0]["dia_semana"] == "lunes"

    @pytest.mark.asyncio
    async def test_get_not_found(self, client):
        r = await client.get(f"{BASE}/999")
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_get_is_public(self, client, db_session):
        """No auth required for getting activity detail."""
        act = await _create_actividad(db_session)
        r = await client.get(f"{BASE}/{act.id}")
        assert r.status_code == 200


class TestCreateActividad:
    @pytest.mark.asyncio
    async def test_create_success(self, client, db_session):
        admin = await _create_admin(db_session)
        payload = {
            "nombre": "Natación",
            "descripcion": "Swimming class",
            "cupo_maximo": 15,
            "duracion_min": 45,
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 201
        data = r.json()
        assert data["nombre"] == "Natación"
        assert data["activa"] is True
        assert data["id"] is not None

    @pytest.mark.asyncio
    async def test_create_duplicate_name(self, client, db_session):
        admin = await _create_admin(db_session)
        await _create_actividad(db_session, nombre="Yoga")

        payload = {
            "nombre": "Yoga",
            "cupo_maximo": 10,
            "duracion_min": 30,
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_create_invalid_data(self, client, db_session):
        admin = await _create_admin(db_session)
        payload = {
            "nombre": "",
            "cupo_maximo": -1,
            "duracion_min": 500,
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_requires_admin(self, client, db_session):
        alumno = await _create_alumno(db_session)
        payload = {
            "nombre": "Boxing",
            "cupo_maximo": 10,
            "duracion_min": 60,
        }
        r = await client.post(BASE, json=payload, headers=_auth(alumno))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client):
        payload = {
            "nombre": "Boxing",
            "cupo_maximo": 10,
            "duracion_min": 60,
        }
        r = await client.post(BASE, json=payload)
        assert r.status_code in (401, 403)


class TestUpdateActividad:
    @pytest.mark.asyncio
    async def test_update_success(self, client, db_session):
        admin = await _create_admin(db_session)
        act = await _create_actividad(db_session)

        payload = {"nombre": "Yoga Avanzado", "cupo_maximo": 30}
        r = await client.put(
            f"{BASE}/{act.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["nombre"] == "Yoga Avanzado"
        assert data["cupo_maximo"] == 30

    @pytest.mark.asyncio
    async def test_update_partial(self, client, db_session):
        admin = await _create_admin(db_session)
        act = await _create_actividad(db_session)

        payload = {"descripcion": "Updated description"}
        r = await client.put(
            f"{BASE}/{act.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["descripcion"] == "Updated description"
        assert data["nombre"] == "Yoga"

    @pytest.mark.asyncio
    async def test_update_duplicate_name(self, client, db_session):
        admin = await _create_admin(db_session)
        await _create_actividad(db_session, nombre="Yoga")
        act2 = await _create_actividad(db_session, nombre="Pilates")

        payload = {"nombre": "Yoga"}
        r = await client.put(
            f"{BASE}/{act2.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_update_same_name_ok(self, client, db_session):
        admin = await _create_admin(db_session)
        act = await _create_actividad(db_session, nombre="Yoga")

        payload = {"nombre": "Yoga", "cupo_maximo": 50}
        r = await client.put(
            f"{BASE}/{act.id}", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 200
        assert r.json()["cupo_maximo"] == 50

    @pytest.mark.asyncio
    async def test_update_not_found(self, client, db_session):
        admin = await _create_admin(db_session)
        payload = {"nombre": "Nope"}
        r = await client.put(
            f"{BASE}/999", json=payload, headers=_auth(admin)
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_update_requires_admin(self, client, db_session):
        alumno = await _create_alumno(db_session)
        act = await _create_actividad(db_session)

        r = await client.put(
            f"{BASE}/{act.id}",
            json={"nombre": "Nope"},
            headers=_auth(alumno),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_update_empty_body(self, client, db_session):
        admin = await _create_admin(db_session)
        act = await _create_actividad(db_session)

        r = await client.put(
            f"{BASE}/{act.id}", json={}, headers=_auth(admin)
        )
        assert r.status_code == 200
        assert r.json()["nombre"] == "Yoga"


class TestDeleteActividad:
    @pytest.mark.asyncio
    async def test_delete_soft(self, client, db_session):
        admin = await _create_admin(db_session)
        act = await _create_actividad(db_session)

        r = await client.delete(
            f"{BASE}/{act.id}", headers=_auth(admin)
        )
        assert r.status_code == 204

        # Verify soft-deleted: not in active list
        r = await client.get(BASE)
        assert r.json()["total"] == 0

        # But still accessible by id
        r = await client.get(f"{BASE}/{act.id}")
        assert r.status_code == 200
        assert r.json()["activa"] is False

    @pytest.mark.asyncio
    async def test_delete_already_inactive(self, client, db_session):
        admin = await _create_admin(db_session)
        act = await _create_actividad(db_session, activa=False)

        r = await client.delete(
            f"{BASE}/{act.id}", headers=_auth(admin)
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
        act = await _create_actividad(db_session)

        r = await client.delete(
            f"{BASE}/{act.id}", headers=_auth(alumno)
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_requires_auth(self, client, db_session):
        act = await _create_actividad(db_session)
        r = await client.delete(f"{BASE}/{act.id}")
        assert r.status_code in (401, 403)
