from fastapi.testclient import TestClient

from app.main import app
from scripts.generate_sitemap import build


def test_security_headers_on_every_response(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert "referrer-policy" in r.headers


def test_unexpected_error_returns_clean_json_without_details():
    @app.get("/api/_boom")
    def boom():
        raise RuntimeError("secret database password is hunter2")

    r = TestClient(app, raise_server_exceptions=False).get("/api/_boom")
    assert r.status_code == 500
    assert r.json() == {"detail": "Something went wrong on our side. Please try again."}
    assert "hunter2" not in r.text


def test_unknown_api_route_is_404_json(client):
    r = client.get("/api/nope")
    assert r.status_code == 404
    assert "detail" in r.json()


def test_sitemap_lists_pages_and_escapes():
    from datetime import datetime

    xml = build("https://example.com", [("DS-101", datetime(2026, 1, 5)), ("DS-102&x", datetime(2026, 2, 6))])
    assert "<loc>https://example.com/</loc>" in xml
    assert "<loc>https://example.com/properties/DS-101</loc><lastmod>2026-01-05</lastmod>" in xml
    assert "DS-102&amp;x" in xml


def test_cors_allows_only_configured_origin(client):
    ok = client.options(
        "/api/listings",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    bad = client.options(
        "/api/listings",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "access-control-allow-origin" not in bad.headers
