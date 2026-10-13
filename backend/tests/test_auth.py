from datetime import datetime, timedelta, timezone

import jwt

from app.config import get_settings
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD


def test_login_success_returns_token(client):
    r = client.post("/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_email_is_case_insensitive(client):
    r = client.post("/api/admin/login", json={"email": ADMIN_EMAIL.upper(), "password": ADMIN_PASSWORD})
    assert r.status_code == 200


def test_login_wrong_password(client):
    r = client.post("/api/admin/login", json={"email": ADMIN_EMAIL, "password": "nope"})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/api/admin/login", json={"email": "who@example.com", "password": "x"})
    assert r.status_code == 401


def test_login_invalid_payload(client):
    r = client.post("/api/admin/login", json={"email": "not-an-email", "password": "x"})
    assert r.status_code == 422


def test_me_requires_token(client):
    assert client.get("/api/admin/me").status_code == 401


def test_me_with_token(client, auth_headers):
    r = client.get("/api/admin/me", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL
    assert "password_hash" not in r.json()


def test_me_rejects_garbage_token(client):
    r = client.get("/api/admin/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_me_rejects_expired_token(client):
    s = get_settings()
    expired = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        s.jwt_secret,
        algorithm=s.jwt_algorithm,
    )
    r = client.get("/api/admin/me", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}
