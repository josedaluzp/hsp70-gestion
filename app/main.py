from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.actividades import router as actividades_router
from app.api.auth import router as auth_router
from app.api.turnos import router as turnos_router
from app.api.usuarios import router as usuarios_router
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
app.include_router(turnos_router)
app.include_router(usuarios_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}
