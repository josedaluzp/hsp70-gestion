from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.usuario import Usuario
from app.services import mercadopago_service

router = APIRouter(prefix="/api/mp", tags=["mercadopago"])


class PlanIdRequest(BaseModel):
    plan_id: int = Field(gt=0)


@router.post("/crear-preferencia")
async def crear_preferencia(
    data: PlanIdRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    return await mercadopago_service.create_preference(db, data.plan_id, current_user)


@router.post("/crear-suscripcion")
async def crear_suscripcion(
    data: PlanIdRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    return await mercadopago_service.create_subscription(db, data.plan_id, current_user)


@router.post("/cancelar-suscripcion/{pago_id}")
async def cancelar_suscripcion(
    pago_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    return await mercadopago_service.cancel_subscription(db, pago_id, current_user)


@router.post("/webhook")
async def webhook(payload: dict, db: AsyncSession = Depends(get_db)):
    return await mercadopago_service.handle_webhook(db, payload)
