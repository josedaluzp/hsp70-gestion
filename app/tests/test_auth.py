import pytest

from app.core.security import create_access_token, hash_password
from app.models.enums import RolUsuario
from app.models.usuario import Usuario

REGISTER_URL = "/api/auth/register"
LOGIN_URL = "/api/auth/login"
ME_URL = "/api/auth/me"

VALID_USER = {
    "nombre": "Juan",
    "apellido": "Pérez",
    "email": "juan@example.com",
    "password": "securepass123",
    "telefono": "1155667788",
    "dni": "12345678",
    "fecha_nacimiento": "1990-01-15",
}


async def _create_user(db_session, *, email="test@example.com", activo=True):
    user = Usuario(
        nombre="Test",
        apellido="User",
        email=email,
        password_hash=hash_password("testpassword"),
        rol=RolUsuario.ALUMNO,
        activo=activo,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


class TestRegister:
    @pytest.mark.asyncio
    async def test_register_success(self, client):
        response = await client.post(REGISTER_URL, json=VALID_USER)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == VALID_USER["email"]
        assert data["nombre"] == VALID_USER["nombre"]
        assert data["rol"] == "alumno"
        assert data["activo"] is True
        assert "password" not in data
        assert "password_hash" not in data

    @pytest.mark.asyncio
    async def test_register_default_role_is_alumno(self, client):
        response = await client.post(REGISTER_URL, json=VALID_USER)
        assert response.json()["rol"] == "alumno"

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client):
        await client.post(REGISTER_URL, json=VALID_USER)
        response = await client.post(REGISTER_URL, json=VALID_USER)
        assert response.status_code == 409
        assert "Email already registered" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_duplicate_dni(self, client):
        await client.post(REGISTER_URL, json=VALID_USER)
        user2 = {**VALID_USER, "email": "otro@example.com"}
        response = await client.post(REGISTER_URL, json=user2)
        assert response.status_code == 409
        assert "DNI already registered" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_missing_required_fields(self, client):
        response = await client.post(REGISTER_URL, json={"email": "a@b.com"})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client):
        data = {**VALID_USER, "email": "not-an-email"}
        response = await client.post(REGISTER_URL, json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_short_password(self, client):
        data = {**VALID_USER, "email": "short@example.com", "password": "short"}
        response = await client.post(REGISTER_URL, json=data)
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_never_in_response(self, client):
        response = await client.post(REGISTER_URL, json=VALID_USER)
        body = response.text
        assert "securepass123" not in body


class TestLogin:
    @pytest.mark.asyncio
    async def test_login_success(self, client, db_session):
        await _create_user(db_session)
        response = await client.post(
            LOGIN_URL, json={"email": "test@example.com", "password": "testpassword"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client, db_session):
        await _create_user(db_session)
        response = await client.post(
            LOGIN_URL, json={"email": "test@example.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_email(self, client):
        response = await client.post(
            LOGIN_URL, json={"email": "noone@example.com", "password": "whatever"}
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client, db_session):
        await _create_user(db_session, activo=False)
        response = await client.post(
            LOGIN_URL, json={"email": "test@example.com", "password": "testpassword"}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_login_returns_valid_jwt(self, client, db_session):
        user = await _create_user(db_session)
        response = await client.post(
            LOGIN_URL, json={"email": "test@example.com", "password": "testpassword"}
        )
        token = response.json()["access_token"]
        # Use the token to access /me
        me_response = await client.get(ME_URL, headers=_auth_header(token))
        assert me_response.status_code == 200
        assert me_response.json()["id"] == user.id


class TestMe:
    @pytest.mark.asyncio
    async def test_me_authenticated(self, client, db_session):
        user = await _create_user(db_session)
        token = create_access_token(subject=user.id)
        response = await client.get(ME_URL, headers=_auth_header(token))
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["nombre"] == "Test"
        assert "password" not in data
        assert "password_hash" not in data

    @pytest.mark.asyncio
    async def test_me_no_token(self, client):
        response = await client.get(ME_URL)
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_me_invalid_token(self, client):
        response = await client.get(ME_URL, headers=_auth_header("bad.token.here"))
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_inactive_user(self, client, db_session):
        user = await _create_user(db_session, activo=False)
        token = create_access_token(subject=user.id)
        response = await client.get(ME_URL, headers=_auth_header(token))
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_me_deleted_user(self, client):
        token = create_access_token(subject=99999)
        response = await client.get(ME_URL, headers=_auth_header(token))
        assert response.status_code == 401


class TestFullFlow:
    @pytest.mark.asyncio
    async def test_register_then_login_then_me(self, client):
        # Register
        reg_response = await client.post(REGISTER_URL, json=VALID_USER)
        assert reg_response.status_code == 201
        user_data = reg_response.json()

        # Login
        login_response = await client.post(
            LOGIN_URL,
            json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Me
        me_response = await client.get(ME_URL, headers=_auth_header(token))
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["id"] == user_data["id"]
        assert me_data["email"] == VALID_USER["email"]
