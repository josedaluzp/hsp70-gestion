import pytest

from app.core.security import create_access_token, hash_password
from app.models.enums import RolUsuario
from app.models.usuario import Usuario

BASE = "/api/usuarios"


async def _create_user(db_session, *, nombre="Test", apellido="User",
                       email="test@test.com", rol=RolUsuario.ALUMNO,
                       activo=True, dni=None):
    user = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        password_hash=hash_password("testpassword"),
        rol=rol,
        activo=activo,
        dni=dni,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _create_admin(db_session, *, email="admin@test.com"):
    return await _create_user(
        db_session, nombre="Admin", apellido="Boss",
        email=email, rol=RolUsuario.ADMIN,
    )


async def _create_recepcionista(db_session, *, email="recep@test.com"):
    return await _create_user(
        db_session, nombre="Recep", apellido="Staff",
        email=email, rol=RolUsuario.RECEPCIONISTA,
    )


def _auth(user):
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}


# ── List usuarios ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_usuarios_as_admin(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, nombre="Juan", apellido="Perez",
                       email="juan@test.com")
    await _create_user(db_session, nombre="Maria", apellido="Lopez",
                       email="maria@test.com")

    resp = await client.get(BASE, headers=_auth(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3  # admin + 2 users
    assert data["page"] == 1
    assert len(data["items"]) == 3


@pytest.mark.asyncio
async def test_list_usuarios_as_recepcionista(client, db_session):
    recep = await _create_recepcionista(db_session)
    resp = await client.get(BASE, headers=_auth(recep))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_usuarios_forbidden_for_alumno(client, db_session):
    alumno = await _create_user(db_session)
    resp = await client.get(BASE, headers=_auth(alumno))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_usuarios_forbidden_for_profesor(client, db_session):
    prof = await _create_user(db_session, email="prof@test.com",
                              rol=RolUsuario.PROFESOR)
    resp = await client.get(BASE, headers=_auth(prof))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_usuarios_filter_by_rol(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, nombre="Prof1", email="p1@test.com",
                       rol=RolUsuario.PROFESOR)
    await _create_user(db_session, nombre="Alumno1", email="a1@test.com",
                       rol=RolUsuario.ALUMNO)

    resp = await client.get(f"{BASE}?rol=profesor", headers=_auth(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["rol"] == "profesor"


@pytest.mark.asyncio
async def test_list_usuarios_filter_by_activo(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, email="active@test.com", activo=True)
    await _create_user(db_session, email="inactive@test.com", activo=False)

    resp = await client.get(f"{BASE}?activo=false", headers=_auth(admin))
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["activo"] is False


@pytest.mark.asyncio
async def test_list_usuarios_search_by_nombre(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, nombre="Fernando", apellido="Garcia",
                       email="fer@test.com")
    await _create_user(db_session, nombre="Laura", apellido="Diaz",
                       email="laura@test.com")

    resp = await client.get(f"{BASE}?search=Fernando", headers=_auth(admin))
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["nombre"] == "Fernando"


@pytest.mark.asyncio
async def test_list_usuarios_search_by_email(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, nombre="Juan", email="juan123@test.com")

    resp = await client.get(f"{BASE}?search=juan123", headers=_auth(admin))
    data = resp.json()
    assert data["total"] == 1


@pytest.mark.asyncio
async def test_list_usuarios_search_by_dni(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, email="dniuser@test.com", dni="12345678")

    resp = await client.get(f"{BASE}?search=12345678", headers=_auth(admin))
    data = resp.json()
    assert data["total"] == 1


@pytest.mark.asyncio
async def test_list_usuarios_pagination(client, db_session):
    admin = await _create_admin(db_session)
    for i in range(5):
        await _create_user(db_session, nombre=f"User{i}",
                           email=f"u{i}@test.com")

    resp = await client.get(f"{BASE}?page=1&page_size=2", headers=_auth(admin))
    data = resp.json()
    assert data["total"] == 6  # admin + 5
    assert data["page_size"] == 2
    assert data["pages"] == 3
    assert len(data["items"]) == 2


# ── Get usuario detail ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_usuario_as_admin(client, db_session):
    admin = await _create_admin(db_session)
    user = await _create_user(db_session, nombre="Detail", email="d@test.com")

    resp = await client.get(f"{BASE}/{user.id}", headers=_auth(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert data["nombre"] == "Detail"
    assert data["id"] == user.id


@pytest.mark.asyncio
async def test_get_usuario_not_found(client, db_session):
    admin = await _create_admin(db_session)
    resp = await client.get(f"{BASE}/9999", headers=_auth(admin))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_usuario_forbidden_for_alumno(client, db_session):
    alumno = await _create_user(db_session)
    resp = await client.get(f"{BASE}/{alumno.id}", headers=_auth(alumno))
    assert resp.status_code == 403


# ── Update usuario ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_update_user_data(client, db_session):
    admin = await _create_admin(db_session)
    user = await _create_user(db_session, email="target@test.com")

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={"nombre": "Updated", "rol": "profesor"},
        headers=_auth(admin),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["nombre"] == "Updated"
    assert data["rol"] == "profesor"


@pytest.mark.asyncio
async def test_admin_update_user_activo(client, db_session):
    admin = await _create_admin(db_session)
    user = await _create_user(db_session, email="target@test.com")

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={"activo": False},
        headers=_auth(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["activo"] is False


@pytest.mark.asyncio
async def test_user_update_own_profile(client, db_session):
    user = await _create_user(db_session, nombre="Original")

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={"nombre": "NewName", "telefono": "1234567890"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["nombre"] == "NewName"
    assert data["telefono"] == "1234567890"


@pytest.mark.asyncio
async def test_user_cannot_change_own_rol(client, db_session):
    user = await _create_user(db_session)

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={"rol": "admin"},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    assert resp.json()["rol"] == "alumno"  # rol unchanged


@pytest.mark.asyncio
async def test_user_cannot_change_own_activo(client, db_session):
    user = await _create_user(db_session)

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={"activo": False},
        headers=_auth(user),
    )
    assert resp.status_code == 200
    assert resp.json()["activo"] is True  # activo unchanged


@pytest.mark.asyncio
async def test_user_cannot_edit_other_user(client, db_session):
    user1 = await _create_user(db_session, email="u1@test.com")
    user2 = await _create_user(db_session, email="u2@test.com")

    resp = await client.put(
        f"{BASE}/{user2.id}",
        json={"nombre": "Hacked"},
        headers=_auth(user1),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_usuario_not_found(client, db_session):
    admin = await _create_admin(db_session)
    resp = await client.put(
        f"{BASE}/9999",
        json={"nombre": "Ghost"},
        headers=_auth(admin),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_email_conflict(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, email="taken@test.com")
    user = await _create_user(db_session, email="mine@test.com")

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={"email": "taken@test.com"},
        headers=_auth(admin),
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_dni_conflict(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, email="other@test.com", dni="11111111")
    user = await _create_user(db_session, email="mine@test.com", dni="22222222")

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={"dni": "11111111"},
        headers=_auth(admin),
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_empty_body(client, db_session):
    admin = await _create_admin(db_session)
    user = await _create_user(db_session, email="nochange@test.com",
                              nombre="Same")

    resp = await client.put(
        f"{BASE}/{user.id}",
        json={},
        headers=_auth(admin),
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Same"


# ── Toggle activo ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_toggle_activo_deactivate(client, db_session):
    admin = await _create_admin(db_session)
    user = await _create_user(db_session, email="target@test.com", activo=True)

    resp = await client.put(
        f"{BASE}/{user.id}/toggle-activo", headers=_auth(admin)
    )
    assert resp.status_code == 200
    assert resp.json()["activo"] is False


@pytest.mark.asyncio
async def test_toggle_activo_reactivate(client, db_session):
    admin = await _create_admin(db_session)
    user = await _create_user(db_session, email="target@test.com", activo=False)

    resp = await client.put(
        f"{BASE}/{user.id}/toggle-activo", headers=_auth(admin)
    )
    assert resp.status_code == 200
    assert resp.json()["activo"] is True


@pytest.mark.asyncio
async def test_toggle_activo_cannot_deactivate_self(client, db_session):
    admin = await _create_admin(db_session)

    resp = await client.put(
        f"{BASE}/{admin.id}/toggle-activo", headers=_auth(admin)
    )
    assert resp.status_code == 400
    assert "own account" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_toggle_activo_not_found(client, db_session):
    admin = await _create_admin(db_session)
    resp = await client.put(
        f"{BASE}/9999/toggle-activo", headers=_auth(admin)
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_toggle_activo_forbidden_for_non_admin(client, db_session):
    recep = await _create_recepcionista(db_session)
    user = await _create_user(db_session, email="target@test.com")

    resp = await client.put(
        f"{BASE}/{user.id}/toggle-activo", headers=_auth(recep)
    )
    assert resp.status_code == 403


# ── List profesores ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_profesores(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, nombre="Prof1", apellido="A",
                       email="p1@test.com", rol=RolUsuario.PROFESOR)
    await _create_user(db_session, nombre="Prof2", apellido="B",
                       email="p2@test.com", rol=RolUsuario.PROFESOR)
    await _create_user(db_session, nombre="Alumno1",
                       email="a1@test.com", rol=RolUsuario.ALUMNO)

    resp = await client.get(f"{BASE}/profesores", headers=_auth(admin))
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert all(p["nombre"].startswith("Prof") for p in data)


@pytest.mark.asyncio
async def test_list_profesores_excludes_inactive(client, db_session):
    admin = await _create_admin(db_session)
    await _create_user(db_session, nombre="Active", email="ap@test.com",
                       rol=RolUsuario.PROFESOR, activo=True)
    await _create_user(db_session, nombre="Inactive", email="ip@test.com",
                       rol=RolUsuario.PROFESOR, activo=False)

    resp = await client.get(f"{BASE}/profesores", headers=_auth(admin))
    data = resp.json()
    assert len(data) == 1
    assert data[0]["nombre"] == "Active"


@pytest.mark.asyncio
async def test_list_profesores_any_authenticated_user(client, db_session):
    alumno = await _create_user(db_session, email="alu@test.com")

    resp = await client.get(f"{BASE}/profesores", headers=_auth(alumno))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_profesores_unauthenticated(client):
    resp = await client.get(f"{BASE}/profesores")
    assert resp.status_code == 401


# ── Unauthenticated access ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_usuarios_unauthenticated(client):
    resp = await client.get(BASE)
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_usuario_unauthenticated(client):
    resp = await client.get(f"{BASE}/1")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_update_usuario_unauthenticated(client):
    resp = await client.put(f"{BASE}/1", json={"nombre": "X"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_toggle_activo_unauthenticated(client):
    resp = await client.put(f"{BASE}/1/toggle-activo")
    assert resp.status_code == 401
