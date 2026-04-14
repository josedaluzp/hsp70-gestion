from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.api.actividades import router as actividades_router
from app.api.ejercicios import router as ejercicios_router
from app.api.asistencias import router as asistencias_router
from app.api.auth import router as auth_router
from app.api.evaluaciones import router as evaluaciones_router
from app.api.inscripciones import router as inscripciones_router
from app.api.notificaciones import router as notificaciones_router
from app.api.planes import router as planes_router
from app.api.turnos import router as turnos_router
from app.api.reportes import router as reportes_router
from app.api.rutinas import router as rutinas_router
from app.api.stats import router as stats_router
from app.api.usuarios import router as usuarios_router
from app.core.config import settings

limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_GENERAL])


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if not settings.DEBUG:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiadas peticiones. Intenta de nuevo más tarde."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)


app.include_router(auth_router)
app.include_router(actividades_router)
app.include_router(ejercicios_router)
app.include_router(asistencias_router)
app.include_router(evaluaciones_router)
app.include_router(inscripciones_router)
app.include_router(notificaciones_router)
app.include_router(planes_router)
app.include_router(reportes_router)
app.include_router(rutinas_router)
app.include_router(stats_router)
app.include_router(turnos_router)
app.include_router(usuarios_router)


@app.on_event("startup")
async def on_startup():
    from app.core.database import Base, engine
    from app.models import (  # noqa: F401
        Actividad, Asistencia, Ejercicio, EvaluacionSalud, Inscripcion,
        ListaEspera, Notificacion, Plan, Rutina, RutinaAsignacion,
        RutinaEjercicio, Turno, Usuario,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
