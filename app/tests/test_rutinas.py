import pytest

from app.core.security import create_access_token, hash_password
from app.models.ejercicio import Ejercicio
from app.models.enums import RolUsuario
from app.models.rutina import Rutina, RutinaAsignacion, RutinaEjercicio
from app.models.usuario import Usuario

BASE = "/api/rutinas"


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


async def _create_rutina(db_session, profesor, *, nombre="Rutina A", descripcion="Desc"):
    rutina = Rutina(nombre=nombre, descripcion=descripcion, profesor_id=profesor.id)
    db_session.add(rutina)
    await db_session.commit()
    await db_session.refresh(rutina)
    return rutina


async def _add_ejercicio_to_rutina(db_session, rutina, ejercicio, *, orden=0):
    re = RutinaEjercicio(rutina_id=rutina.id, ejercicio_id=ejercicio.id, orden=orden)
    db_session.add(re)
    await db_session.commit()
    await db_session.refresh(re)
    return re


async def _assign_rutina(db_session, rutina, alumno):
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
        data = r.json()
        assert data["items"] == []
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_with_items(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        await _create_rutina(db_session, profesor, nombre="Rutina A")
        await _create_rutina(db_session, profesor, nombre="Rutina B")
        r = await client.get(BASE, headers=_auth(profesor))
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 2

    @pytest.mark.asyncio
    async def test_list_denied_for_alumno(self, client, db_session):
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        r = await client.get(BASE, headers=_auth(alumno))
        assert r.status_code == 403


class TestCreateRutina:
    @pytest.mark.asyncio
    async def test_create_empty_rutina(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        payload = {"nombre": "Rutina Nueva", "descripcion": "Sin ejercicios"}
        r = await client.post(BASE, json=payload, headers=_auth(profesor))
        assert r.status_code == 201
        data = r.json()
        assert data["nombre"] == "Rutina Nueva"
        assert data["ejercicios"] == []

    @pytest.mark.asyncio
    async def test_create_with_exercises(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        ej = await _create_ejercicio(db_session)
        payload = {
            "nombre": "Rutina Full",
            "ejercicios": [{"ejercicio_id": ej.id, "orden": 1}],
        }
        r = await client.post(BASE, json=payload, headers=_auth(profesor))
        assert r.status_code == 201
        data = r.json()
        assert len(data["ejercicios"]) == 1
        assert data["ejercicios"][0]["ejercicio"]["id"] == ej.id

    @pytest.mark.asyncio
    async def test_create_invalid_exercise_id(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        payload = {
            "nombre": "Rutina Bad",
            "ejercicios": [{"ejercicio_id": 9999, "orden": 0}],
        }
        r = await client.post(BASE, json=payload, headers=_auth(profesor))
        assert r.status_code == 400


class TestUpdateRutina:
    @pytest.mark.asyncio
    async def test_update_success(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        rutina = await _create_rutina(db_session, profesor)
        payload = {"nombre": "Rutina Actualizada"}
        r = await client.put(f"{BASE}/{rutina.id}", json=payload, headers=_auth(profesor))
        assert r.status_code == 200
        assert r.json()["nombre"] == "Rutina Actualizada"

    @pytest.mark.asyncio
    async def test_update_other_profesor_denied(self, client, db_session):
        profesor1 = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof1@test.com")
        profesor2 = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof2@test.com")
        rutina = await _create_rutina(db_session, profesor1)
        payload = {"nombre": "Hack"}
        r = await client.put(f"{BASE}/{rutina.id}", json=payload, headers=_auth(profesor2))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_update_admin_can_update_any(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        admin = await _create_user(db_session, rol=RolUsuario.ADMIN, email="admin@test.com")
        rutina = await _create_rutina(db_session, profesor)
        payload = {"nombre": "Admin Edit"}
        r = await client.put(f"{BASE}/{rutina.id}", json=payload, headers=_auth(admin))
        assert r.status_code == 200
        assert r.json()["nombre"] == "Admin Edit"


class TestDeleteRutina:
    @pytest.mark.asyncio
    async def test_delete_success(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        rutina = await _create_rutina(db_session, profesor)
        r = await client.delete(f"{BASE}/{rutina.id}", headers=_auth(profesor))
        assert r.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_not_found(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        r = await client.delete(f"{BASE}/999", headers=_auth(profesor))
        assert r.status_code == 404


class TestAsignarRutina:
    @pytest.mark.asyncio
    async def test_asignar_success(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        rutina = await _create_rutina(db_session, profesor)
        payload = {"alumno_id": alumno.id}
        r = await client.post(
            f"{BASE}/{rutina.id}/asignar", json=payload, headers=_auth(profesor),
        )
        assert r.status_code == 201
        data = r.json()
        assert data["alumno_id"] == alumno.id
        assert data["rutina_id"] == rutina.id

    @pytest.mark.asyncio
    async def test_asignar_duplicate(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        rutina = await _create_rutina(db_session, profesor)
        await _assign_rutina(db_session, rutina, alumno)
        payload = {"alumno_id": alumno.id}
        r = await client.post(
            f"{BASE}/{rutina.id}/asignar", json=payload, headers=_auth(profesor),
        )
        assert r.status_code == 409


class TestDesasignarRutina:
    @pytest.mark.asyncio
    async def test_desasignar_success(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        rutina = await _create_rutina(db_session, profesor)
        await _assign_rutina(db_session, rutina, alumno)
        r = await client.delete(
            f"{BASE}/{rutina.id}/asignar/{alumno.id}", headers=_auth(profesor),
        )
        assert r.status_code == 204


class TestListAsignaciones:
    @pytest.mark.asyncio
    async def test_list_asignaciones(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        rutina = await _create_rutina(db_session, profesor)
        await _assign_rutina(db_session, rutina, alumno)
        r = await client.get(
            f"{BASE}/{rutina.id}/asignaciones", headers=_auth(profesor),
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["alumno_id"] == alumno.id


class TestAlumnoRutinas:
    @pytest.mark.asyncio
    async def test_alumno_sees_own_rutinas(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        rutina = await _create_rutina(db_session, profesor)
        await _assign_rutina(db_session, rutina, alumno)
        r = await client.get(
            f"/api/alumnos/{alumno.id}/rutinas", headers=_auth(alumno),
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["nombre"] == "Rutina A"

    @pytest.mark.asyncio
    async def test_alumno_sees_detail_with_exercises(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        ej = await _create_ejercicio(db_session)
        rutina = await _create_rutina(db_session, profesor)
        await _add_ejercicio_to_rutina(db_session, rutina, ej, orden=1)
        await _assign_rutina(db_session, rutina, alumno)
        r = await client.get(
            f"/api/alumnos/{alumno.id}/rutinas/{rutina.id}", headers=_auth(alumno),
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data["ejercicios"]) == 1
        assert data["ejercicios"][0]["ejercicio"]["nombre"] == "Press banca"

    @pytest.mark.asyncio
    async def test_alumno_cannot_see_unassigned(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com")
        rutina = await _create_rutina(db_session, profesor)
        r = await client.get(
            f"/api/alumnos/{alumno.id}/rutinas/{rutina.id}", headers=_auth(alumno),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_alumno_cannot_see_others(self, client, db_session):
        profesor = await _create_user(db_session, rol=RolUsuario.PROFESOR, email="prof@test.com")
        alumno1 = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno1@test.com")
        alumno2 = await _create_user(db_session, rol=RolUsuario.ALUMNO, email="alumno2@test.com")
        rutina = await _create_rutina(db_session, profesor)
        await _assign_rutina(db_session, rutina, alumno1)
        r = await client.get(
            f"/api/alumnos/{alumno1.id}/rutinas", headers=_auth(alumno2),
        )
        assert r.status_code == 403
