"""Admin dashboard statistics endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.schemas.stats import DashboardStats
from app.services import stats_service

router = APIRouter(tags=["stats"])


@router.get("/api/stats/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
) -> DashboardStats:
    """Return aggregated statistics for the admin dashboard."""
    return await stats_service.get_dashboard_stats(db)
