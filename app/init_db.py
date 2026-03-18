"""Create all database tables from SQLAlchemy models."""

import asyncio

from app.core.database import Base, engine
from app.models import (  # noqa: F401 - imports register models with Base
    Actividad,
    Asistencia,
    EvaluacionSalud,
    Inscripcion,
    ListaEspera,
    Notificacion,
    Pago,
    Plan,
    Turno,
    Usuario,
)


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


if __name__ == "__main__":
    asyncio.run(init_db())
    print("Database tables created successfully.")
