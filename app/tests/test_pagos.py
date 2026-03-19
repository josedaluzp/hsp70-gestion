from datetime import date, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models.enums import EstadoPago, MetodoPago, RolUsuario
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.usuario import Usuario

BASE = "/api/pagos"


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


async def _create_plan(db_session, *, nombre="Plan Mensual"):
    plan = Plan(
        nombre=nombre,
        descripcion="Test plan",
        precio=5000.00,
        duracion_dias=30,
        max_actividades=5,
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    return plan


async def _create_pago(
    db_session,
    *,
    alumno_id,
    plan_id,
    estado=EstadoPago.PENDIENTE,
    metodo_pago=MetodoPago.EFECTIVO,
):
    pago = Pago(
        alumno_id=alumno_id,
        plan_id=plan_id,
        monto=5000.00,
        fecha_vencimiento=date.today() + timedelta(days=30),
        estado=estado,
        metodo_pago=metodo_pago,
    )
    db_session.add(pago)
    await db_session.commit()
    await db_session.refresh(pago)
    return pago


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


class TestListPagos:
    @pytest.mark.asyncio
    async def test_list_empty(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.get(BASE, headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    @pytest.mark.asyncio
    async def test_list_returns_pagos(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(db_session, alumno_id=alumno.id, plan_id=plan.id)

        r = await client.get(BASE, headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["alumno_id"] == alumno.id

    @pytest.mark.asyncio
    async def test_list_filter_by_alumno(self, client, db_session):
        admin = await _create_user(db_session)
        alumno1 = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno1@test.com"
        )
        alumno2 = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno2@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(db_session, alumno_id=alumno1.id, plan_id=plan.id)
        await _create_pago(db_session, alumno_id=alumno2.id, plan_id=plan.id)

        r = await client.get(
            BASE, params={"alumno_id": alumno1.id}, headers=_auth(admin)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["alumno_id"] == alumno1.id

    @pytest.mark.asyncio
    async def test_list_filter_by_estado(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            estado=EstadoPago.PENDIENTE,
        )
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            estado=EstadoPago.APROBADO,
        )

        r = await client.get(
            BASE, params={"estado": "aprobado"}, headers=_auth(admin)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["estado"] == "aprobado"

    @pytest.mark.asyncio
    async def test_list_pagination(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        for _ in range(5):
            await _create_pago(db_session, alumno_id=alumno.id, plan_id=plan.id)

        r = await client.get(
            BASE, params={"page": 1, "page_size": 2}, headers=_auth(admin)
        )
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 5
        assert data["pages"] == 3
        assert len(data["items"]) == 2

    @pytest.mark.asyncio
    async def test_list_requires_auth(self, client):
        r = await client.get(BASE)
        assert r.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_list_forbidden_for_alumno(self, client, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        r = await client.get(BASE, headers=_auth(alumno))
        assert r.status_code == 403


class TestGetPago:
    @pytest.mark.asyncio
    async def test_get_existing(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        pago = await _create_pago(
            db_session, alumno_id=alumno.id, plan_id=plan.id
        )

        r = await client.get(f"{BASE}/{pago.id}", headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == pago.id
        assert data["alumno_id"] == alumno.id
        assert data["metodo_pago"] == "efectivo"

    @pytest.mark.asyncio
    async def test_get_not_found(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.get(f"{BASE}/999", headers=_auth(admin))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_get_requires_auth(self, client):
        r = await client.get(f"{BASE}/1")
        assert r.status_code in (401, 403)


class TestCreatePago:
    @pytest.mark.asyncio
    async def test_create_manual_efectivo(self, client, db_session):
        recep = await _create_user(
            db_session, rol=RolUsuario.RECEPCIONISTA, email="recep@test.com"
        )
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)

        payload = {
            "alumno_id": alumno.id,
            "plan_id": plan.id,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload, headers=_auth(recep))
        assert r.status_code == 201
        data = r.json()
        assert data["alumno_id"] == alumno.id
        assert data["metodo_pago"] == "efectivo"
        assert data["estado"] == "pendiente"
        assert data["id"] is not None

    @pytest.mark.asyncio
    async def test_create_manual_transferencia(self, client, db_session):
        recep = await _create_user(
            db_session, rol=RolUsuario.RECEPCIONISTA, email="recep@test.com"
        )
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)

        payload = {
            "alumno_id": alumno.id,
            "plan_id": plan.id,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "transferencia",
        }
        r = await client.post(BASE, json=payload, headers=_auth(recep))
        assert r.status_code == 201
        assert r.json()["metodo_pago"] == "transferencia"

    @pytest.mark.asyncio
    async def test_create_admin_allowed(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)

        payload = {
            "alumno_id": alumno.id,
            "plan_id": plan.id,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 201

    @pytest.mark.asyncio
    async def test_create_invalid_alumno(self, client, db_session):
        admin = await _create_user(db_session)
        plan = await _create_plan(db_session)

        payload = {
            "alumno_id": 9999,
            "plan_id": plan.id,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_create_invalid_plan(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )

        payload = {
            "alumno_id": alumno.id,
            "plan_id": 9999,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_create_invalid_monto(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)

        payload = {
            "alumno_id": alumno.id,
            "plan_id": plan.id,
            "monto": -100,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_past_fecha_vencimiento(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)

        payload = {
            "alumno_id": alumno.id,
            "plan_id": plan.id,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() - timedelta(days=1)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload, headers=_auth(admin))
        assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_create_forbidden_for_alumno(self, client, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)

        payload = {
            "alumno_id": alumno.id,
            "plan_id": plan.id,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload, headers=_auth(alumno))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_create_requires_auth(self, client):
        payload = {
            "alumno_id": 1,
            "plan_id": 1,
            "monto": 5000.00,
            "fecha_vencimiento": str(date.today() + timedelta(days=30)),
            "metodo_pago": "efectivo",
        }
        r = await client.post(BASE, json=payload)
        assert r.status_code in (401, 403)


class TestUpdatePago:
    @pytest.mark.asyncio
    async def test_update_estado(self, client, db_session):
        recep = await _create_user(
            db_session, rol=RolUsuario.RECEPCIONISTA, email="recep@test.com"
        )
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        pago = await _create_pago(
            db_session, alumno_id=alumno.id, plan_id=plan.id
        )

        r = await client.patch(
            f"{BASE}/{pago.id}",
            json={"estado": "aprobado"},
            headers=_auth(recep),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["estado"] == "aprobado"

    @pytest.mark.asyncio
    async def test_update_monto(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        pago = await _create_pago(
            db_session, alumno_id=alumno.id, plan_id=plan.id
        )

        r = await client.patch(
            f"{BASE}/{pago.id}",
            json={"monto": 7500.00},
            headers=_auth(admin),
        )
        assert r.status_code == 200
        assert r.json()["monto"] == 7500.00

    @pytest.mark.asyncio
    async def test_update_empty_body(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        pago = await _create_pago(
            db_session, alumno_id=alumno.id, plan_id=plan.id
        )

        r = await client.patch(
            f"{BASE}/{pago.id}", json={}, headers=_auth(admin)
        )
        assert r.status_code == 200
        assert r.json()["estado"] == "pendiente"

    @pytest.mark.asyncio
    async def test_update_not_found(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.patch(
            f"{BASE}/999",
            json={"estado": "aprobado"},
            headers=_auth(admin),
        )
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_update_forbidden_for_alumno(self, client, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        r = await client.patch(
            f"{BASE}/1",
            json={"estado": "aprobado"},
            headers=_auth(alumno),
        )
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_update_requires_auth(self, client):
        r = await client.patch(f"{BASE}/1", json={"estado": "aprobado"})
        assert r.status_code in (401, 403)
