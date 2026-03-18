import pytest

from app.core.security import create_access_token, hash_password
from app.models.enums import RolUsuario
from app.models.evaluacion_salud import EvaluacionSalud
from app.models.usuario import Usuario


async def _create_user(db_session, *, email, rol, nombre="Test"):
    user = Usuario(
        nombre=nombre,
        apellido="User",
        email=email,
        password_hash=hash_password("testpassword"),
        rol=rol,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_admin(db_session):
    return await _create_user(
        db_session, email="admin@test.com", rol=RolUsuario.ADMIN, nombre="Admin"
    )


async def _create_profesor(db_session, *, email="profesor@test.com"):
    return await _create_user(
        db_session, email=email, rol=RolUsuario.PROFESOR, nombre="Profesor"
    )


async def _create_alumno(db_session, *, email="alumno@test.com"):
    return await _create_user(
        db_session, email=email, rol=RolUsuario.ALUMNO, nombre="Alumno"
    )


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


def _valid_payload(alumno_id):
    return {
        "alumno_id": alumno_id,
        "peso_kg": 75.5,
        "altura_cm": 175.0,
        "grasa_corporal": 18.5,
        "objetivo": "Ganar masa muscular",
        "notas": "Buen estado general",
    }


class TestCreateEvaluacion:
    @pytest.mark.asyncio
    async def test_create_success_as_profesor(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        r = await client.post(
            "/api/evaluaciones",
            json=_valid_payload(alumno.id),
            headers=_auth(profesor),
        )
        assert r.status_code == 201
        data = r.json()
        assert data["alumno_id"] == alumno.id
        assert data["profesional_id"] == profesor.id
        assert data["peso_kg"] == 75.5
        assert data["altura_cm"] == 175.0
        assert data["grasa_corporal"] == 18.5
        assert data["objetivo"] == "Ganar masa muscular"
        assert data["notas"] == "Buen estado general"
        assert data["id"] is not None
        assert data["fecha"] is not None

    @pytest.mark.asyncio
    async def test_create_success_as_admin(self, client, db_session):
        admin = await _create_admin(db_session)
        alumno = await _create_alumno(db_session)

        r = await client.post(
            "/api/evaluaciones",
            json=_valid_payload(alumno.id),
            headers=_auth(admin),
        )
        assert r.status_code == 201
        assert r.json()["profesional_id"] == admin.id

    @pytest.mark.asyncio
    async def test_imc_auto_calculated(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        r = await client.post(
            "/api/evaluaciones",
            json=_valid_payload(alumno.id),
            headers=_auth(profesor),
        )
        assert r.status_code == 201
        data = r.json()
        # IMC = 75.5 / (1.75^2) = 75.5 / 3.0625 = 24.65
        expected_imc = round(75.5 / (1.75**2), 2)
        assert abs(data["imc"] - expected_imc) < 0.1

    @pytest.mark.asyncio
    async def test_create_alumno_not_found(self, client, db_session):
        profesor = await _create_profesor(db_session)

        r = await client.post(
            "/api/evaluaciones",
            json=_valid_payload(999),
            headers=_auth(profesor),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_create_target_not_alumno(self, client, db_session):
        profesor = await _create_profesor(db_session)
        otro_prof = await _create_profesor(
            db_session, email="otro@test.com"
        )

        r = await client.post(
            "/api/evaluaciones",
            json=_valid_payload(otro_prof.id),
            headers=_auth(profesor),
        )
        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_create_forbidden_for_alumno(self, client, db_session):
        alumno = await _create_alumno(db_session)

        r = await client.post(
            "/api/evaluaciones",
            json=_valid_payload(alumno.id),
            headers=_auth(alumno),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client, db_session):
        alumno = await _create_alumno(db_session)

        r = await client.post(
            "/api/evaluaciones",
            json=_valid_payload(alumno.id),
        )
        assert r.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_create_peso_below_min(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = _valid_payload(alumno.id)
        payload["peso_kg"] = 10
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_peso_above_max(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = _valid_payload(alumno.id)
        payload["peso_kg"] = 350
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_altura_below_min(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = _valid_payload(alumno.id)
        payload["altura_cm"] = 30
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_altura_above_max(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = _valid_payload(alumno.id)
        payload["altura_cm"] = 260
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_optional_fields(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = {
            "alumno_id": alumno.id,
            "peso_kg": 80,
            "altura_cm": 180,
        }
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 201
        data = r.json()
        assert data["grasa_corporal"] is None
        assert data["objetivo"] is None
        assert data["notas"] is None
        assert data["imc"] is not None


class TestListEvaluacionesAlumno:
    @pytest.mark.asyncio
    async def test_list_as_alumno_own(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        # Create two evaluations
        for peso in [70.0, 72.0]:
            ev = EvaluacionSalud(
                alumno_id=alumno.id,
                profesional_id=profesor.id,
                peso_kg=peso,
                altura_cm=175,
                imc=round(peso / 1.75**2, 2),
            )
            db_session.add(ev)
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/evaluaciones",
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2

    @pytest.mark.asyncio
    async def test_list_ordered_by_fecha_desc(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        # Create via API to get proper timestamps
        for peso in [70.0, 75.0, 80.0]:
            payload = {
                "alumno_id": alumno.id,
                "peso_kg": peso,
                "altura_cm": 175,
            }
            await client.post(
                "/api/evaluaciones", json=payload, headers=_auth(profesor)
            )

        r = await client.get(
            f"/api/alumnos/{alumno.id}/evaluaciones",
            headers=_auth(alumno),
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 3
        # Most recent first
        dates = [item["fecha"] for item in data]
        assert dates == sorted(dates, reverse=True)

    @pytest.mark.asyncio
    async def test_list_alumno_cannot_see_others(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        alumno2 = await _create_alumno(db_session, email="a2@test.com")

        ev = EvaluacionSalud(
            alumno_id=alumno2.id,
            profesional_id=profesor.id,
            peso_kg=70,
            altura_cm=170,
            imc=24.22,
        )
        db_session.add(ev)
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno2.id}/evaluaciones",
            headers=_auth(alumno1),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_list_as_profesor(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        ev = EvaluacionSalud(
            alumno_id=alumno.id,
            profesional_id=profesor.id,
            peso_kg=70,
            altura_cm=170,
            imc=24.22,
        )
        db_session.add(ev)
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/evaluaciones",
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1

    @pytest.mark.asyncio
    async def test_list_profesor_sees_only_own_evaluations(
        self, client, db_session
    ):
        profesor1 = await _create_profesor(db_session, email="p1@test.com")
        profesor2 = await _create_profesor(db_session, email="p2@test.com")
        alumno = await _create_alumno(db_session)

        for prof in [profesor1, profesor2]:
            ev = EvaluacionSalud(
                alumno_id=alumno.id,
                profesional_id=prof.id,
                peso_kg=70,
                altura_cm=170,
                imc=24.22,
            )
            db_session.add(ev)
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/evaluaciones",
            headers=_auth(profesor1),
        )
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 1
        assert data[0]["profesional_id"] == profesor1.id

    @pytest.mark.asyncio
    async def test_list_as_admin_sees_all(self, client, db_session):
        admin = await _create_admin(db_session)
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        for _ in range(3):
            ev = EvaluacionSalud(
                alumno_id=alumno.id,
                profesional_id=profesor.id,
                peso_kg=70,
                altura_cm=170,
                imc=24.22,
            )
            db_session.add(ev)
        await db_session.commit()

        r = await client.get(
            f"/api/alumnos/{alumno.id}/evaluaciones",
            headers=_auth(admin),
        )
        assert r.status_code == 200
        assert len(r.json()) == 3

    @pytest.mark.asyncio
    async def test_list_alumno_not_found(self, client, db_session):
        admin = await _create_admin(db_session)

        r = await client.get(
            "/api/alumnos/999/evaluaciones",
            headers=_auth(admin),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_list_empty(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        r = await client.get(
            f"/api/alumnos/{alumno.id}/evaluaciones",
            headers=_auth(profesor),
        )
        assert r.status_code == 200
        assert r.json() == []

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client, db_session):
        alumno = await _create_alumno(db_session)

        r = await client.get(f"/api/alumnos/{alumno.id}/evaluaciones")
        assert r.status_code in (401, 403)


class TestGetEvaluacion:
    @pytest.mark.asyncio
    async def test_get_as_alumno_own(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        ev = EvaluacionSalud(
            alumno_id=alumno.id,
            profesional_id=profesor.id,
            peso_kg=75,
            altura_cm=175,
            imc=24.49,
        )
        db_session.add(ev)
        await db_session.commit()
        await db_session.refresh(ev)

        r = await client.get(
            f"/api/evaluaciones/{ev.id}", headers=_auth(alumno)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == ev.id
        assert data["alumno_id"] == alumno.id

    @pytest.mark.asyncio
    async def test_get_alumno_cannot_see_others(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno1 = await _create_alumno(db_session, email="a1@test.com")
        alumno2 = await _create_alumno(db_session, email="a2@test.com")

        ev = EvaluacionSalud(
            alumno_id=alumno2.id,
            profesional_id=profesor.id,
            peso_kg=75,
            altura_cm=175,
            imc=24.49,
        )
        db_session.add(ev)
        await db_session.commit()
        await db_session.refresh(ev)

        r = await client.get(
            f"/api/evaluaciones/{ev.id}", headers=_auth(alumno1)
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_get_as_profesor_own(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        ev = EvaluacionSalud(
            alumno_id=alumno.id,
            profesional_id=profesor.id,
            peso_kg=75,
            altura_cm=175,
            imc=24.49,
        )
        db_session.add(ev)
        await db_session.commit()
        await db_session.refresh(ev)

        r = await client.get(
            f"/api/evaluaciones/{ev.id}", headers=_auth(profesor)
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_get_profesor_cannot_see_other_prof(self, client, db_session):
        profesor1 = await _create_profesor(db_session, email="p1@test.com")
        profesor2 = await _create_profesor(db_session, email="p2@test.com")
        alumno = await _create_alumno(db_session)

        ev = EvaluacionSalud(
            alumno_id=alumno.id,
            profesional_id=profesor2.id,
            peso_kg=75,
            altura_cm=175,
            imc=24.49,
        )
        db_session.add(ev)
        await db_session.commit()
        await db_session.refresh(ev)

        r = await client.get(
            f"/api/evaluaciones/{ev.id}", headers=_auth(profesor1)
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_get_as_admin(self, client, db_session):
        admin = await _create_admin(db_session)
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        ev = EvaluacionSalud(
            alumno_id=alumno.id,
            profesional_id=profesor.id,
            peso_kg=75,
            altura_cm=175,
            imc=24.49,
        )
        db_session.add(ev)
        await db_session.commit()
        await db_session.refresh(ev)

        r = await client.get(
            f"/api/evaluaciones/{ev.id}", headers=_auth(admin)
        )
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_get_not_found(self, client, db_session):
        admin = await _create_admin(db_session)

        r = await client.get(
            "/api/evaluaciones/999", headers=_auth(admin)
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, client, db_session):
        r = await client.get("/api/evaluaciones/1")
        assert r.status_code in (401, 403)


class TestImcCalculation:
    @pytest.mark.asyncio
    async def test_imc_various_values(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        cases = [
            (60, 160, round(60 / (1.60**2), 2)),
            (100, 200, round(100 / (2.00**2), 2)),
            (45, 150, round(45 / (1.50**2), 2)),
        ]
        for peso, altura, expected_imc in cases:
            payload = {
                "alumno_id": alumno.id,
                "peso_kg": peso,
                "altura_cm": altura,
            }
            r = await client.post(
                "/api/evaluaciones", json=payload, headers=_auth(profesor)
            )
            assert r.status_code == 201
            assert abs(r.json()["imc"] - expected_imc) < 0.1


class TestValidationBoundaries:
    @pytest.mark.asyncio
    async def test_peso_at_min_boundary(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = {"alumno_id": alumno.id, "peso_kg": 20, "altura_cm": 100}
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_peso_at_max_boundary(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = {"alumno_id": alumno.id, "peso_kg": 300, "altura_cm": 100}
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_altura_at_min_boundary(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = {"alumno_id": alumno.id, "peso_kg": 70, "altura_cm": 50}
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_altura_at_max_boundary(self, client, db_session):
        profesor = await _create_profesor(db_session)
        alumno = await _create_alumno(db_session)

        payload = {"alumno_id": alumno.id, "peso_kg": 70, "altura_cm": 250}
        r = await client.post(
            "/api/evaluaciones", json=payload, headers=_auth(profesor)
        )
        assert r.status_code == 201
