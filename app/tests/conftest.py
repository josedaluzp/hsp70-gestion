import os
import tempfile

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import app

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
TEST_DB_PATH = _tmp.name
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"

engine_test = create_async_engine(TEST_DATABASE_URL)
async_session_test = async_sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db():
    async with async_session_test() as session:
        yield session


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_session():
    async with async_session_test() as session:
        yield session


def pytest_sessionfinish(session, exitstatus):
    try:
        os.unlink(TEST_DB_PATH)
    except OSError:
        pass
