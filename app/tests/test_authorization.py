import pytest
from fastapi import APIRouter, Depends

from app.core.deps import require_role
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.enums import RolUsuario
from app.models.usuario import Usuario

# --- Test router with role-protected endpoints ---

_router = APIRouter(prefix="/api/test-authz", tags=["test-authz"])


@_router.get("/admin-only")
async def admin_only(user: Usuario = Depends(require_role(RolUsuario.ADMIN))):
    return {"ok": True, "rol": user.rol.value}


@_router.get("/profesores")
async def profesores(
    user: Usuario = Depends(require_role(RolUsuario.PROFESOR)),
):
    return {"ok": True, "rol": user.rol.value}


@_router.get("/recepcion")
async def recepcion(
    user: Usuario = Depends(
        require_role(RolUsuario.RECEPCIONISTA, RolUsuario.ADMIN),
    ),
):
    return {"ok": True, "rol": user.rol.value}


@_router.get("/multi-role")
async def multi_role(
    user: Usuario = Depends(
        require_role(RolUsuario.ALUMNO, RolUsuario.PROFESOR),
    ),
):
    return {"ok": True, "rol": user.rol.value}


app.include_router(_router)

# --- Helpers ---

ADMIN_ONLY_URL = "/api/test-authz/admin-only"
PROFESORES_URL = "/api/test-authz/profesores"
RECEPCION_URL = "/api/test-authz/recepcion"
MULTI_ROLE_URL = "/api/test-authz/multi-role"


async def _create_user_with_role(db_session, rol, *, email=None, activo=True):
    email = email or f"{rol.value}@test.com"
    user = Usuario(
        nombre="Test",
        apellido=rol.value.capitalize(),
        email=email,
        password_hash=hash_password("testpassword"),
        rol=rol,
        activo=activo,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestAdminAlwaysPasses:
    """Admin role bypasses any require_role check."""

    @pytest.mark.asyncio
    async def test_admin_accesses_admin_only(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.ADMIN)
        token = create_access_token(subject=user.id)
        r = await client.get(ADMIN_ONLY_URL, headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["rol"] == "admin"

    @pytest.mark.asyncio
    async def test_admin_accesses_profesor_endpoint(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.ADMIN)
        token = create_access_token(subject=user.id)
        r = await client.get(PROFESORES_URL, headers=_auth(token))
        assert r.status_code == 200

    @pytest.mark.asyncio
    async def test_admin_accesses_multi_role_endpoint(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.ADMIN)
        token = create_access_token(subject=user.id)
        r = await client.get(MULTI_ROLE_URL, headers=_auth(token))
        assert r.status_code == 200


class TestRoleEnforcement:
    """Non-admin users are restricted to their allowed roles."""

    @pytest.mark.asyncio
    async def test_alumno_denied_admin_only(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.ALUMNO)
        token = create_access_token(subject=user.id)
        r = await client.get(ADMIN_ONLY_URL, headers=_auth(token))
        assert r.status_code == 403
        assert "alumno" in r.json()["detail"]

    @pytest.mark.asyncio
    async def test_alumno_denied_profesor_endpoint(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.ALUMNO)
        token = create_access_token(subject=user.id)
        r = await client.get(PROFESORES_URL, headers=_auth(token))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_profesor_accesses_profesor_endpoint(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.PROFESOR)
        token = create_access_token(subject=user.id)
        r = await client.get(PROFESORES_URL, headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["rol"] == "profesor"

    @pytest.mark.asyncio
    async def test_profesor_denied_recepcion(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.PROFESOR)
        token = create_access_token(subject=user.id)
        r = await client.get(RECEPCION_URL, headers=_auth(token))
        assert r.status_code == 403

    @pytest.mark.asyncio
    async def test_recepcionista_accesses_recepcion(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.RECEPCIONISTA)
        token = create_access_token(subject=user.id)
        r = await client.get(RECEPCION_URL, headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["rol"] == "recepcionista"

    @pytest.mark.asyncio
    async def test_recepcionista_denied_profesor(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.RECEPCIONISTA)
        token = create_access_token(subject=user.id)
        r = await client.get(PROFESORES_URL, headers=_auth(token))
        assert r.status_code == 403


class TestMultiRole:
    """Endpoints that allow multiple roles."""

    @pytest.mark.asyncio
    async def test_alumno_accesses_multi(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.ALUMNO)
        token = create_access_token(subject=user.id)
        r = await client.get(MULTI_ROLE_URL, headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["rol"] == "alumno"

    @pytest.mark.asyncio
    async def test_profesor_accesses_multi(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.PROFESOR)
        token = create_access_token(subject=user.id)
        r = await client.get(MULTI_ROLE_URL, headers=_auth(token))
        assert r.status_code == 200
        assert r.json()["rol"] == "profesor"

    @pytest.mark.asyncio
    async def test_recepcionista_denied_multi(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.RECEPCIONISTA)
        token = create_access_token(subject=user.id)
        r = await client.get(MULTI_ROLE_URL, headers=_auth(token))
        assert r.status_code == 403


class TestErrorMessages:
    """Error responses include the user's role for clarity."""

    @pytest.mark.asyncio
    async def test_forbidden_message_contains_role(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.ALUMNO)
        token = create_access_token(subject=user.id)
        r = await client.get(ADMIN_ONLY_URL, headers=_auth(token))
        detail = r.json()["detail"]
        assert "alumno" in detail
        assert "does not have access" in detail

    @pytest.mark.asyncio
    async def test_forbidden_message_profesor(self, client, db_session):
        user = await _create_user_with_role(db_session, RolUsuario.PROFESOR)
        token = create_access_token(subject=user.id)
        r = await client.get(RECEPCION_URL, headers=_auth(token))
        detail = r.json()["detail"]
        assert "profesor" in detail


class TestAuthPrecedence:
    """Auth checks (401) happen before role checks (403)."""

    @pytest.mark.asyncio
    async def test_no_token_returns_401_or_403(self, client):
        r = await client.get(ADMIN_ONLY_URL)
        assert r.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self, client):
        r = await client.get(ADMIN_ONLY_URL, headers=_auth("bad.token"))
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_inactive_user_returns_403(self, client, db_session):
        user = await _create_user_with_role(
            db_session, RolUsuario.ADMIN, activo=False
        )
        token = create_access_token(subject=user.id)
        r = await client.get(ADMIN_ONLY_URL, headers=_auth(token))
        assert r.status_code == 403
        assert "Inactive" in r.json()["detail"]
