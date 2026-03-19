from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.vencimiento import VencimientoCheckResult
from app.services.vencimiento_service import check_vencimientos

router = APIRouter(prefix="/api/vencimientos", tags=["vencimientos"])


@router.post("/check", response_model=VencimientoCheckResult)
async def run_check_vencimientos(
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    return await check_vencimientos(db)
