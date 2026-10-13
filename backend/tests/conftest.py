import os
import tempfile
from pathlib import Path

# Tests always run on a throwaway SQLite file, never on the real database.
_tmp = Path(tempfile.mkdtemp(prefix="devsphere_test_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-not-for-production-0123456789"
os.environ["UPLOAD_DIR"] = str(_tmp / "uploads")
os.environ["LEAD_RATE_LIMIT"] = "1000"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AdminUser  # noqa: E402
from app.security import hash_password  # noqa: E402
from app.services.ratelimit import lead_limiter  # noqa: E402

ADMIN_EMAIL = "owner@example.com"
ADMIN_PASSWORD = "correct-horse-battery"


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    lead_limiter.reset()
    with SessionLocal() as db:
        db.add(AdminUser(email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD)))
        db.commit()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    r = client.post("/api/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def listing_payload(**overrides):
    base = dict(
        title="2 BHK flat near Green Park",
        kind="sale",
        property_type="flat",
        locality="Green Park Road",
        city="Jaipur",
        price=6_800_000,
        carpet_area_sqft=780,
        bedrooms=2,
        floor=3,
        total_floors=7,
        age_years=4,
        facing="East",
        furnishing="semi-furnished",
        description="Nice flat",
        amenities=["Lift", "Parking"],
    )
    base.update(overrides)
    return base


@pytest.fixture
def make_listing(client, auth_headers):
    def _make(**overrides):
        r = client.post("/api/admin/listings", json=listing_payload(**overrides), headers=auth_headers)
        assert r.status_code == 201, r.text
        return r.json()

    return _make
