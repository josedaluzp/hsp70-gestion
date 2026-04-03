from datetime import date, timedelta

import mercadopago
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.enums import (
    EstadoPago,
    MetodoPago,
    RolUsuario,
    TipoPago,
)
from app.models.pago import Pago
from app.models.plan import Plan
from app.models.usuario import Usuario


def _get_sdk() -> mercadopago.SDK:
    """Return a configured MercadoPago SDK instance."""
    if not settings.MP_ACCESS_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MercadoPago is not configured",
        )
    return mercadopago.SDK(settings.MP_ACCESS_TOKEN)


async def _get_plan_or_404(db: AsyncSession, plan_id: int) -> Plan:
    """Fetch a plan by ID or raise 404."""
    result = await db.execute(select(Plan).where(Plan.id == plan_id))
    plan = result.scalar_one_or_none()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found",
        )
    return plan


async def create_preference(
    db: AsyncSession, plan_id: int, alumno: Usuario
) -> dict:
    """Create a MercadoPago payment preference for a one-time payment."""
    plan = await _get_plan_or_404(db, plan_id)
    sdk = _get_sdk()

    pago = Pago(
        alumno_id=alumno.id,
        plan_id=plan.id,
        monto=float(plan.precio),
        fecha_vencimiento=date.today() + timedelta(days=plan.duracion_dias),
        estado=EstadoPago.PENDIENTE,
        tipo_pago=TipoPago.UNICO,
        metodo_pago=MetodoPago.MERCADOPAGO,
    )
    db.add(pago)
    await db.commit()
    await db.refresh(pago)

    preference_data = {
        "items": [
            {
                "title": f"{plan.nombre} - HSP-70",
                "quantity": 1,
                "unit_price": float(plan.precio),
                "currency_id": "ARS",
            }
        ],
        "back_urls": {
            "success": f"{settings.CORS_ORIGINS[0]}/alumno/pagos?status=approved",
            "failure": f"{settings.CORS_ORIGINS[0]}/alumno/pagos?status=failure",
            "pending": f"{settings.CORS_ORIGINS[0]}/alumno/pagos?status=pending",
        },
        "auto_return": "approved",
        "external_reference": str(pago.id),
    }

    result = sdk.preference().create(preference_data)
    if result.get("status") != 201:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create MercadoPago preference",
        )

    return {
        "checkout_url": result["response"]["init_point"],
        "pago_id": pago.id,
    }


async def create_subscription(
    db: AsyncSession, plan_id: int, alumno: Usuario
) -> dict:
    """Create a MercadoPago subscription (preapproval)."""
    plan = await _get_plan_or_404(db, plan_id)

    if plan.precio_suscripcion is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This plan does not support subscriptions",
        )

    sdk = _get_sdk()

    pago = Pago(
        alumno_id=alumno.id,
        plan_id=plan.id,
        monto=float(plan.precio_suscripcion),
        fecha_vencimiento=date.today() + timedelta(days=plan.duracion_dias),
        estado=EstadoPago.PENDIENTE,
        tipo_pago=TipoPago.SUSCRIPCION,
        metodo_pago=MetodoPago.MERCADOPAGO,
    )
    db.add(pago)
    await db.commit()
    await db.refresh(pago)

    preapproval_data = {
        "reason": f"{plan.nombre} - HSP-70",
        "auto_recurring": {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": float(plan.precio_suscripcion),
            "currency_id": "ARS",
        },
        "back_url": f"{settings.CORS_ORIGINS[0]}/alumno/pagos?status=approved",
        "payer_email": alumno.email,
        "external_reference": str(pago.id),
    }

    result = sdk.preapproval().create(preapproval_data)
    if result.get("status") != 201:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create MercadoPago subscription",
        )

    return {
        "checkout_url": result["response"]["init_point"],
        "pago_id": pago.id,
    }


async def cancel_subscription(
    db: AsyncSession, pago_id: int, current_user: Usuario
) -> dict:
    """Cancel an active MercadoPago subscription."""
    result = await db.execute(select(Pago).where(Pago.id == pago_id))
    pago = result.scalar_one_or_none()
    if pago is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )

    if pago.tipo_pago != TipoPago.SUSCRIPCION or not pago.mp_subscription_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This payment is not an active subscription",
        )

    is_owner = pago.alumno_id == current_user.id
    is_admin = current_user.rol == RolUsuario.ADMIN
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this subscription",
        )

    sdk = _get_sdk()
    sdk.preapproval().update(pago.mp_subscription_id, {"status": "cancelled"})

    pago.mp_subscription_id = None
    await db.commit()
    await db.refresh(pago)

    return {"status": "cancelled", "pago_id": pago.id}


async def handle_webhook(db: AsyncSession, payload: dict) -> dict:
    """Handle MercadoPago webhook notifications."""
    event_type = payload.get("type")

    if event_type == "payment":
        mp_payment_id = payload.get("data", {}).get("id")
        if mp_payment_id:
            await _process_payment_notification(db, int(mp_payment_id))

    return {"status": "ok"}


async def _process_payment_notification(
    db: AsyncSession, mp_payment_id: int
) -> None:
    """Fetch payment details from MP and update local Pago record."""
    sdk = _get_sdk()
    result = sdk.payment().get(mp_payment_id)

    if result.get("status") != 200:
        return

    payment_data = result["response"]
    mp_status = payment_data.get("status")
    external_ref = payment_data.get("external_reference")

    if not external_ref:
        return

    pago_result = await db.execute(
        select(Pago).where(Pago.id == int(external_ref))
    )
    pago = pago_result.scalar_one_or_none()
    if pago is None:
        return

    status_map = {
        "approved": EstadoPago.APROBADO,
        "rejected": EstadoPago.RECHAZADO,
    }
    new_status = status_map.get(mp_status)
    if new_status is None:
        return

    pago.estado = new_status
    pago.mp_payment_id = str(mp_payment_id)

    if new_status == EstadoPago.APROBADO:
        plan_result = await db.execute(
            select(Plan).where(Plan.id == pago.plan_id)
        )
        plan = plan_result.scalar_one_or_none()
        if plan:
            pago.fecha_vencimiento = date.today() + timedelta(
                days=plan.duracion_dias
            )

    await db.commit()
