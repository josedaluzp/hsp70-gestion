from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.actividades import router as actividades_router
from app.api.asistencias import router as asistencias_router
from app.api.auth import router as auth_router
from app.api.evaluaciones import router as evaluaciones_router
from app.api.inscripciones import router as inscripciones_router
from app.api.notificaciones import router as notificaciones_router
from app.api.pagos import router as pagos_router
from app.api.planes import router as planes_router
from app.api.turnos import router as turnos_router
from app.api.reportes import router as reportes_router
from app.api.stats import router as stats_router
from app.api.usuarios import router as usuarios_router
from app.api.vencimientos import router as vencimientos_router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(actividades_router)
app.include_router(asistencias_router)
app.include_router(evaluaciones_router)
app.include_router(inscripciones_router)
app.include_router(notificaciones_router)
app.include_router(pagos_router)
app.include_router(planes_router)
app.include_router(reportes_router)
app.include_router(stats_router)
app.include_router(turnos_router)
app.include_router(usuarios_router)
app.include_router(vencimientos_router)


@app.on_event("startup")
async def on_startup():
    from app.core.database import Base, engine
    from app.models import (  # noqa: F401
        Actividad, Asistencia, EvaluacionSalud, Inscripcion,
        ListaEspera, Notificacion, Pago, Plan, Turno, Usuario,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
