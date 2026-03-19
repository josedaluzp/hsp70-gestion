from datetime import date, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import EstadoPago
from app.models.notificacion import Notificacion
from app.models.pago import Pago

NEAR_EXPIRY_DAYS = 5

TIPO_PAGO_VENCIDO = "pago_vencido"
TIPO_PAGO_POR_VENCER = "pago_por_vencer"


async def check_vencimientos(db: AsyncSession) -> dict:
    today = date.today()
    expired = await _process_expired(db, today)
    near_expiry = await _process_near_expiry(db, today)
    await db.commit()
    return {
        "fecha": str(today),
        "vencidos": expired,
        "proximos_a_vencer": near_expiry,
    }


async def _process_expired(db: AsyncSession, today: date) -> int:
    result = await db.execute(
        select(Pago).where(
            Pago.fecha_vencimiento < today,
            Pago.estado.in_([EstadoPago.APROBADO, EstadoPago.PENDIENTE]),
        )
    )
    pagos = list(result.scalars().all())

    for pago in pagos:
        pago.estado = EstadoPago.VENCIDO
        dias = (today - pago.fecha_vencimiento).days
        db.add(
            Notificacion(
                usuario_id=pago.alumno_id,
                tipo=TIPO_PAGO_VENCIDO,
                mensaje=(
                    f"Tu pago #{pago.id} venció hace {dias} día(s) "
                    f"(vencimiento: {pago.fecha_vencimiento}). "
                    "Por favor, regulariza tu situación."
                ),
            )
        )

    return len(pagos)


async def _process_near_expiry(db: AsyncSession, today: date) -> int:
    limit = today + timedelta(days=NEAR_EXPIRY_DAYS)

    result = await db.execute(
        select(Pago).where(
            Pago.fecha_vencimiento >= today,
            Pago.fecha_vencimiento <= limit,
            Pago.estado == EstadoPago.APROBADO,
        )
    )
    pagos = list(result.scalars().all())

    already_notified = await _get_already_notified_today(db, today)
    count = 0

    for pago in pagos:
        if pago.id in already_notified:
            continue
        dias = (pago.fecha_vencimiento - today).days
        db.add(
            Notificacion(
                usuario_id=pago.alumno_id,
                tipo=TIPO_PAGO_POR_VENCER,
                mensaje=(
                    f"Tu pago #{pago.id} vence en {dias} día(s) "
                    f"(vencimiento: {pago.fecha_vencimiento}). "
                    "Recuerda renovar a tiempo."
                ),
            )
        )
        count += 1

    return count


async def _get_already_notified_today(
    db: AsyncSession, today: date
) -> set[int]:
    """Return pago IDs that already got a near-expiry notification today."""
    result = await db.execute(
        select(Notificacion.mensaje).where(
            Notificacion.tipo == TIPO_PAGO_POR_VENCER,
            func.date(Notificacion.fecha) == today,
        )
    )
    messages = result.scalars().all()
    pago_ids: set[int] = set()
    for msg in messages:
        pago_id = _extract_pago_id(msg)
        if pago_id is not None:
            pago_ids.add(pago_id)
    return pago_ids


def _extract_pago_id(mensaje: str) -> int | None:
    """Extract pago ID from notification message like 'Tu pago #123 ...'."""
    try:
        start = mensaje.index("#") + 1
        end = mensaje.index(" ", start)
        return int(mensaje[start:end])
    except (ValueError, IndexError):
        return None
