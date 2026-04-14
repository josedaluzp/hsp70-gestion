import pytest

from app.core.security import create_access_token, hash_password
from app.models.ejercicio import Ejercicio
from app.models.enums import RolUsuario
from app.models.usuario import Usuario

BASE = "/api/ejercicios"


async def _create_user(db_session, *, rol=RolUsuario.ADMIN, email="admin@test.com"):
    user = Usuario(
        nombre="Test", apellido="User", email=email,
        password_hash=hash_password("testpassword"), rol=rol,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_ejercicio(db_session, *, nombre="Press banca", video_url="https://yt.com/1"):
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
    async def test_list_with_items(self, client, db_session):
        admin = await _create_user(db_session)
        await _create_ejercicio(db_session, nombre="Sentadilla")
        await _create_ejercicio(db_session, nombre="Press banca")
        r = await client.get(BASE, headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_list_search_by_name(self, client, db_session):
        admin = await _create_user(db_session)
        await _create_ejercicio(db_session, nombre="Sentadilla")
        await _create_ejercicio(db_session, nombre="Press banca")
        r = await client.get(BASE, params={"nombre": "sent"}, headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["nombre"] == "Sentadilla"

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client):
        r = await client.get(BASE)
        assert r.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_list_denied_for_alumno(self, client, db_session):
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        r = await client.get(BASE, headers=_auth(alumno))
        assert r.status_code == 403


class TestCreateEjercicio:
    @pytest.mark.asyncio
    async def test_create_success(self, client, db_session):
        admin = await _create_user(db_session)
        payload = {"nombre": "Sentadilla", "video_url": "https://yt.com/squat"}
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 201
        data = r.json()
        assert data["nombre"] == "Sentadilla"
        assert data["video_url"] == "https://yt.com/squat"
        assert data["id"] is not None

    @pytest.mark.asyncio
    async def test_create_duplicate_name(self, client, db_session):
        admin = await _create_user(db_session)
        await _create_ejercicio(db_session, nombre="Sentadilla")
        payload = {"nombre": "Sentadilla", "video_url": "https://yt.com/2"}
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 409

    @pytest.mark.asyncio
    async def test_create_profesor_allowed(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        payload = {"nombre": "Curl biceps", "video_url": "https://yt.com/curl"}
        r = await client.post(BASE, json=payload, headers=_auth(profesor))
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_create_alumno_denied(self, client, db_session):
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        payload = {"nombre": "Sentadilla", "video_url": "https://yt.com/1"}
        r = await client.post(BASE, json=payload, headers=_auth(alumno))
        assert r.status_code == 403


class TestUpdateEjercicio:
    @pytest.mark.asyncio
    async def test_update_success(self, client, db_session):
        admin = await _create_user(db_session)
        ej = await _create_ejercicio(db_session)
        payload = {"nombre": "Press banca inclinado"}
        r = await client.put(f"{BASE}/{ej.id}", json=payload, headers=_auth(admin))
        assert r.status_code == 200
        assert r.json()["nombre"] == "Press banca inclinado"

    @pytest.mark.asyncio
    async def test_update_not_found(self, client, db_session):
        admin = await _create_user(db_session)
        payload = {"nombre": "Nope"}
        r = await client.put(f"{BASE}/999", json=payload, headers=_auth(admin))
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
