from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.core.security import create_access_token, hash_password
from app.models.enums import (
    EstadoPago,
    MetodoPago,
    RolUsuario,
    TipoPago,
)
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.usuario import Usuario

BASE = "/api/mp"


async def _create_user(db_session, *, rol=RolUsuario.ALUMNO, email="alumno@test.com"):
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


async def _create_plan(db_session, *, nombre="Plan Mensual", precio_suscripcion=None):
    plan = Plan(
        nombre=nombre,
        descripcion="Test plan",
        precio=5000.00,
        duracion_dias=30,
        max_actividades=5,
        precio_suscripcion=precio_suscripcion,
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    return plan


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


def _mock_sdk():
    """Build a mock SDK with preference, preapproval, and payment methods."""
    sdk = MagicMock()

    sdk.preference.return_value.create.return_value = {
        "status": 201,
        "response": {
            "id": "pref_123",
            "init_point": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref_123",
        },
    }

    sdk.preapproval.return_value.create.return_value = {
        "status": 201,
        "response": {
            "id": "preapproval_123",
            "init_point": "https://www.mercadopago.com.ar/subscriptions?preapproval_id=preapproval_123",
        },
    }

    sdk.preapproval.return_value.update.return_value = {"status": 200}

    sdk.payment.return_value.get.return_value = {
        "status": 200,
        "response": {
            "id": 12345,
            "status": "approved",
            "external_reference": "1",
        },
    }

    return sdk


class TestCreatePreference:
    @pytest.mark.asyncio
    async def test_creates_preference_and_pago(self, client, db_session):
        alumno = await _create_user(db_session)
        plan = await _create_plan(db_session)

        mock_sdk = _mock_sdk()
        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=mock_sdk
        ):
            r = await client.post(
                f"{BASE}/crear-preferencia",
                json={"plan_id": plan.id},
                headers=_auth(alumno),
            )

        assert r.status_code == 200
        data = r.json()
        assert "checkout_url" in data
        assert "pago_id" in data
        assert data["checkout_url"].startswith("https://")

        mock_sdk.preference.return_value.create.assert_called_once()
        call_args = mock_sdk.preference.return_value.create.call_args[0][0]
        assert call_args["items"][0]["title"] == f"{plan.nombre} - HSP-70"
        assert call_args["items"][0]["unit_price"] == float(plan.precio)

    @pytest.mark.asyncio
    async def test_invalid_plan_returns_404(self, client, db_session):
        alumno = await _create_user(db_session)

        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=_mock_sdk()
        ):
            r = await client.post(
                f"{BASE}/crear-preferencia",
                json={"plan_id": 9999},
                headers=_auth(alumno),
            )

        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        r = await client.post(
            f"{BASE}/crear-preferencia",
            json={"plan_id": 1},
        )
        assert r.status_code in (401, 403)


class TestCreateSubscription:
    @pytest.mark.asyncio
    async def test_creates_subscription_and_pago(self, client, db_session):
        alumno = await _create_user(db_session)
        plan = await _create_plan(
            db_session, precio_suscripcion=4500.00
        )

        mock_sdk = _mock_sdk()
        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=mock_sdk
        ):
            r = await client.post(
                f"{BASE}/crear-suscripcion",
                json={"plan_id": plan.id},
                headers=_auth(alumno),
            )

        assert r.status_code == 200
        data = r.json()
        assert "checkout_url" in data
        assert "pago_id" in data

        mock_sdk.preapproval.return_value.create.assert_called_once()
        call_args = mock_sdk.preapproval.return_value.create.call_args[0][0]
        assert call_args["reason"] == f"{plan.nombre} - HSP-70"
        assert call_args["auto_recurring"]["transaction_amount"] == 4500.00
        assert call_args["payer_email"] == alumno.email

    @pytest.mark.asyncio
    async def test_plan_without_subscription_price_returns_400(
        self, client, db_session
    ):
        alumno = await _create_user(db_session)
        plan = await _create_plan(db_session)  # no precio_suscripcion

        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=_mock_sdk()
        ):
            r = await client.post(
                f"{BASE}/crear-suscripcion",
                json={"plan_id": plan.id},
                headers=_auth(alumno),
            )

        assert r.status_code == 400
        assert "subscription" in r.json()["detail"].lower()


class TestCancelSubscription:
    @pytest.mark.asyncio
    async def test_cancel_own_subscription(self, client, db_session):
        alumno = await _create_user(db_session)
        plan = await _create_plan(db_session)

        pago = Pago(
            alumno_id=alumno.id,
            plan_id=plan.id,
            monto=4500.00,
            fecha_vencimiento=date.today() + timedelta(days=30),
            estado=EstadoPago.APROBADO,
            tipo_pago=TipoPago.SUSCRIPCION,
            metodo_pago=MetodoPago.MERCADOPAGO,
            mp_subscription_id="preapproval_abc",
        )
        db_session.add(pago)
        await db_session.commit()
        await db_session.refresh(pago)

        mock_sdk = _mock_sdk()
        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=mock_sdk
        ):
            r = await client.post(
                f"{BASE}/cancelar-suscripcion/{pago.id}",
                headers=_auth(alumno),
            )

        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "cancelled"
        assert data["pago_id"] == pago.id

        mock_sdk.preapproval.return_value.update.assert_called_once_with(
            "preapproval_abc", {"status": "cancelled"}
        )

    @pytest.mark.asyncio
    async def test_cancel_not_subscription_returns_400(self, client, db_session):
        alumno = await _create_user(db_session)
        plan = await _create_plan(db_session)

        pago = Pago(
            alumno_id=alumno.id,
            plan_id=plan.id,
            monto=5000.00,
            fecha_vencimiento=date.today() + timedelta(days=30),
            estado=EstadoPago.PENDIENTE,
            tipo_pago=TipoPago.UNICO,
            metodo_pago=MetodoPago.MERCADOPAGO,
        )
        db_session.add(pago)
        await db_session.commit()
        await db_session.refresh(pago)

        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=_mock_sdk()
        ):
            r = await client.post(
                f"{BASE}/cancelar-suscripcion/{pago.id}",
                headers=_auth(alumno),
            )

        assert r.status_code == 400

    @pytest.mark.asyncio
    async def test_cancel_other_user_returns_403(self, client, db_session):
        owner = await _create_user(db_session, email="owner@test.com")
        other = await _create_user(db_session, email="other@test.com")
        plan = await _create_plan(db_session)

        pago = Pago(
            alumno_id=owner.id,
            plan_id=plan.id,
            monto=4500.00,
            fecha_vencimiento=date.today() + timedelta(days=30),
            estado=EstadoPago.APROBADO,
            tipo_pago=TipoPago.SUSCRIPCION,
            metodo_pago=MetodoPago.MERCADOPAGO,
            mp_subscription_id="preapproval_xyz",
        )
        db_session.add(pago)
        await db_session.commit()
        await db_session.refresh(pago)

        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=_mock_sdk()
        ):
            r = await client.post(
                f"{BASE}/cancelar-suscripcion/{pago.id}",
                headers=_auth(other),
            )

        assert r.status_code == 403


class TestWebhook:
    @pytest.mark.asyncio
    async def test_payment_approved_webhook(self, client, db_session):
        alumno = await _create_user(db_session)
        plan = await _create_plan(db_session)

        pago = Pago(
            alumno_id=alumno.id,
            plan_id=plan.id,
            monto=5000.00,
            fecha_vencimiento=date.today() + timedelta(days=30),
            estado=EstadoPago.PENDIENTE,
            tipo_pago=TipoPago.UNICO,
            metodo_pago=MetodoPago.MERCADOPAGO,
        )
        db_session.add(pago)
        await db_session.commit()
        await db_session.refresh(pago)

        mock_sdk = _mock_sdk()
        mock_sdk.payment.return_value.get.return_value = {
            "status": 200,
            "response": {
                "id": 77777,
                "status": "approved",
                "external_reference": str(pago.id),
            },
        }

        with patch(
            "app.services.mercadopago_service._get_sdk", return_value=mock_sdk
        ):
            r = await client.post(
                f"{BASE}/webhook",
                json={"type": "payment", "data": {"id": 77777}},
            )

        assert r.status_code == 200
        assert r.json()["status"] == "ok"

        await db_session.refresh(pago)
        assert pago.estado == EstadoPago.APROBADO
        assert pago.mp_payment_id == "77777"

    @pytest.mark.asyncio
    async def test_unknown_webhook_type_returns_200(self, client):
        r = await client.post(
            f"{BASE}/webhook",
            json={"type": "merchant_order", "data": {"id": "abc"}},
        )
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
