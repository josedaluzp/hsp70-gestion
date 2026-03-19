"""Report and export endpoints (admin only)."""

from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_role
from app.models.enums import RolUsuario
from app.models.usuario import Usuario
from app.services import reporte_service

router = APIRouter(tags=["reportes"])

_EXCEL_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_PDF_MEDIA = "application/pdf"


def _excel_response(content: bytes, filename: str) -> StreamingResponse:
    """Build a StreamingResponse for an Excel download."""
    return StreamingResponse(
        iter([content]),
        media_type=_EXCEL_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _pdf_response(content: bytes, filename: str) -> StreamingResponse:
    """Build a StreamingResponse for a PDF download."""
    return StreamingResponse(
        iter([content]),
        media_type=_PDF_MEDIA,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/reportes/alumnos/excel")
async def reporte_alumnos_excel(
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    """Export all students to a styled Excel file."""
    content = await reporte_service.generar_excel_alumnos(db)
    return _excel_response(content, "alumnos.xlsx")


@router.get("/api/reportes/asistencias/excel")
async def reporte_asistencias_excel(
    fecha_inicio: date = Query(..., description="Start date (YYYY-MM-DD)"),
    fecha_fin: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    """Export attendance records for a period, grouped by activity/shift."""
    content = await reporte_service.generar_excel_asistencias(
        db, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
    )
    return _excel_response(content, f"asistencias_{fecha_inicio}_{fecha_fin}.xlsx")


@router.get("/api/reportes/pagos/excel")
async def reporte_pagos_excel(
    fecha_inicio: date = Query(..., description="Start date (YYYY-MM-DD)"),
    fecha_fin: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    """Export payment history for a period to Excel."""
    content = await reporte_service.generar_excel_pagos(
        db, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin
    )
    return _excel_response(content, f"pagos_{fecha_inicio}_{fecha_fin}.xlsx")


@router.get("/api/reportes/morosos/excel")
async def reporte_morosos_excel(
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    """Export students with overdue payments to Excel."""
    content = await reporte_service.generar_excel_morosos(db)
    return _excel_response(content, "morosos.xlsx")


@router.get("/api/reportes/alumno/{alumno_id}/pdf")
async def reporte_alumno_pdf(
    alumno_id: int,
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(require_role(RolUsuario.ADMIN)),
):
    """Generate a professional PDF profile card for a student."""
    content = await reporte_service.generar_pdf_alumno(db, alumno_id=alumno_id)
    return _pdf_response(content, f"alumno_{alumno_id}_ficha.pdf")
