from datetime import date, timedelta

import pytest

from app.core.security import create_access_token, hash_password
from app.models.enums import EstadoPago, MetodoPago, RolUsuario
from app.models.notificacion import Notificacion
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.usuario import Usuario
from app.services.vencimiento_service import (
    TIPO_PAGO_POR_VENCER,
    TIPO_PAGO_VENCIDO,
    check_vencimientos,
)

BASE = "/api/vencimientos"


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
    estado=EstadoPago.APROBADO,
    fecha_vencimiento=None,
):
    if fecha_vencimiento is None:
        fecha_vencimiento = date.today() + timedelta(days=30)
    pago = Pago(
        alumno_id=alumno_id,
        plan_id=plan_id,
        monto=5000.00,
        fecha_vencimiento=fecha_vencimiento,
        estado=estado,
        metodo_pago=MetodoPago.EFECTIVO,
    )
    db_session.add(pago)
    await db_session.commit()
    await db_session.refresh(pago)
    return pago


def _auth(user):
    token = create_access_token(subject=user.id)
    return {"Authorization": f"Bearer {token}"}


class TestCheckVencimientosService:
    @pytest.mark.asyncio
    async def test_no_payments(self, db_session):
        result = await check_vencimientos(db_session)
        assert result["vencidos"] == 0
        assert result["proximos_a_vencer"] == 0

    @pytest.mark.asyncio
    async def test_expired_payment_marked_vencido(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        pago = await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            estado=EstadoPago.APROBADO,
            fecha_vencimiento=date.today() - timedelta(days=3),
        )

        result = await check_vencimientos(db_session)

        assert result["vencidos"] == 1
        await db_session.refresh(pago)
        assert pago.estado == EstadoPago.VENCIDO

    @pytest.mark.asyncio
    async def test_expired_pendiente_also_marked(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        pago = await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            estado=EstadoPago.PENDIENTE,
            fecha_vencimiento=date.today() - timedelta(days=1),
        )

        result = await check_vencimientos(db_session)

        assert result["vencidos"] == 1
        await db_session.refresh(pago)
        assert pago.estado == EstadoPago.VENCIDO

    @pytest.mark.asyncio
    async def test_expired_creates_notification(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() - timedelta(days=2),
        )

        await check_vencimientos(db_session)

        from sqlalchemy import select

        result = await db_session.execute(
            select(Notificacion).where(
                Notificacion.usuario_id == alumno.id,
                Notificacion.tipo == TIPO_PAGO_VENCIDO,
            )
        )
        notifs = list(result.scalars().all())
        assert len(notifs) == 1
        assert "venció hace 2 día(s)" in notifs[0].mensaje

    @pytest.mark.asyncio
    async def test_near_expiry_notification(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() + timedelta(days=3),
        )

        result = await check_vencimientos(db_session)

        assert result["proximos_a_vencer"] == 1

        from sqlalchemy import select

        notif_result = await db_session.execute(
            select(Notificacion).where(
                Notificacion.usuario_id == alumno.id,
                Notificacion.tipo == TIPO_PAGO_POR_VENCER,
            )
        )
        notifs = list(notif_result.scalars().all())
        assert len(notifs) == 1
        assert "vence en 3 día(s)" in notifs[0].mensaje

    @pytest.mark.asyncio
    async def test_near_expiry_includes_today(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today(),
        )

        result = await check_vencimientos(db_session)
        assert result["proximos_a_vencer"] == 1

    @pytest.mark.asyncio
    async def test_near_expiry_boundary_5_days(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() + timedelta(days=5),
        )

        result = await check_vencimientos(db_session)
        assert result["proximos_a_vencer"] == 1

    @pytest.mark.asyncio
    async def test_beyond_5_days_not_flagged(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() + timedelta(days=6),
        )

        result = await check_vencimientos(db_session)
        assert result["proximos_a_vencer"] == 0

    @pytest.mark.asyncio
    async def test_already_vencido_not_reprocessed(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            estado=EstadoPago.VENCIDO,
            fecha_vencimiento=date.today() - timedelta(days=10),
        )

        result = await check_vencimientos(db_session)
        assert result["vencidos"] == 0

    @pytest.mark.asyncio
    async def test_rechazado_not_processed(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            estado=EstadoPago.RECHAZADO,
            fecha_vencimiento=date.today() - timedelta(days=5),
        )

        result = await check_vencimientos(db_session)
        assert result["vencidos"] == 0

    @pytest.mark.asyncio
    async def test_near_expiry_dedup_on_second_run(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() + timedelta(days=3),
        )

        result1 = await check_vencimientos(db_session)
        assert result1["proximos_a_vencer"] == 1

        result2 = await check_vencimientos(db_session)
        assert result2["proximos_a_vencer"] == 0

    @pytest.mark.asyncio
    async def test_expired_not_reprocessed_on_second_run(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() - timedelta(days=1),
        )

        result1 = await check_vencimientos(db_session)
        assert result1["vencidos"] == 1

        result2 = await check_vencimientos(db_session)
        assert result2["vencidos"] == 0

    @pytest.mark.asyncio
    async def test_multiple_payments_mixed(self, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)

        # Expired
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() - timedelta(days=2),
        )
        # Near expiry
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() + timedelta(days=4),
        )
        # Far future (not flagged)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() + timedelta(days=20),
        )

        result = await check_vencimientos(db_session)
        assert result["vencidos"] == 1
        assert result["proximos_a_vencer"] == 1


class TestCheckVencimientosEndpoint:
    @pytest.mark.asyncio
    async def test_admin_can_trigger(self, client, db_session):
        admin = await _create_user(db_session)
        r = await client.post(f"{BASE}/check", headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert "vencidos" in data
        assert "proximos_a_vencer" in data
        assert "fecha" in data

    @pytest.mark.asyncio
    async def test_returns_correct_counts(self, client, db_session):
        admin = await _create_user(db_session)
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        plan = await _create_plan(db_session)
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() - timedelta(days=1),
        )
        await _create_pago(
            db_session,
            alumno_id=alumno.id,
            plan_id=plan.id,
            fecha_vencimiento=date.today() + timedelta(days=2),
        )

        r = await client.post(f"{BASE}/check", headers=_auth(admin))
        assert r.status_code == 200
        data = r.json()
        assert data["vencidos"] == 1
        assert data["proximos_a_vencer"] == 1

    @pytest.mark.asyncio
    async def test_forbidden_for_alumno(self, client, db_session):
        alumno = await _create_user(
            db_session, rol=RolUsuario.ALUMNO, email="alumno@test.com"
        )
        r = await client.post(f"{BASE}/check", headers=_auth(alumno))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_forbidden_for_recepcionista(self, client, db_session):
        recep = await _create_user(
            db_session, rol=RolUsuario.RECEPCIONISTA, email="recep@test.com"
        )
        r = await client.post(f"{BASE}/check", headers=_auth(recep))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_requires_auth(self, client):
        r = await client.post(f"{BASE}/check")
        assert r.status_code in (401, 403)
