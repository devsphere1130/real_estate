"""Cloudinary storage. Cloudinary itself is replaced by a fake, so these tests never use the network."""
from pathlib import Path

import cloudinary.uploader
import pytest

from app.config import get_settings
from app.database import SessionLocal
from app.models import ListingPhoto
from app.services import storage as storage_module
from app.services.storage import CloudinaryStorage, LocalStorage
from tests.test_photos import image_bytes, photos_of, upload, url

FIELDS = (
    "storage_backend",
    "cloudinary_url",
    "cloudinary_cloud_name",
    "cloudinary_api_key",
    "cloudinary_api_secret",
    "cloudinary_folder",
)
CLOUD_PREFIX = "https://res.cloudinary.com/democloud/image/upload/"


@pytest.fixture(autouse=True)
def restore_storage_settings():
    settings = get_settings()
    saved = {f: getattr(settings, f) for f in FIELDS}
    storage_module.get_storage.cache_clear()
    yield
    for field, value in saved.items():
        setattr(settings, field, value)
    storage_module.get_storage.cache_clear()


@pytest.fixture
def cloud(monkeypatch):
    """Switch the app to Cloudinary with a fake uploader; returns a record of what was called."""
    settings = get_settings()
    settings.storage_backend = "cloudinary"
    settings.cloudinary_url = ""
    settings.cloudinary_cloud_name = "democloud"
    settings.cloudinary_api_key = "123456"
    settings.cloudinary_api_secret = "secret"
    settings.cloudinary_folder = "real-estate/properties"
    storage_module.get_storage.cache_clear()

    calls = {"upload": [], "destroy": [], "fail_on_upload_number": None}

    def fake_upload(file, **options):
        number = len(calls["upload"]) + 1
        if calls["fail_on_upload_number"] == number:
            raise RuntimeError("simulated Cloudinary outage")
        calls["upload"].append({"bytes": file.read(), **options})
        return {"public_id": f"{options['folder']}/{options['public_id']}"}

    def fake_destroy(public_id, **options):
        calls["destroy"].append(public_id)
        return {"result": "ok"}

    monkeypatch.setattr(cloudinary.uploader, "upload", fake_upload)
    monkeypatch.setattr(cloudinary.uploader, "destroy", fake_destroy)
    return calls


def png(name="a.png"):
    return (name, image_bytes("PNG"), "image/png")


# ----- choosing the storage -----


def test_local_storage_is_used_without_cloudinary_keys():
    settings = get_settings()
    settings.storage_backend = "auto"
    for field in ("cloudinary_url", "cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret"):
        setattr(settings, field, "")
    storage_module.get_storage.cache_clear()
    assert isinstance(storage_module.get_storage(), LocalStorage)


def test_auto_switches_to_cloudinary_when_keys_are_set(cloud):
    get_settings().storage_backend = "auto"
    storage_module.get_storage.cache_clear()
    assert isinstance(storage_module.get_storage(), CloudinaryStorage)


def test_local_can_be_forced_even_with_keys(cloud):
    get_settings().storage_backend = "local"
    storage_module.get_storage.cache_clear()
    assert isinstance(storage_module.get_storage(), LocalStorage)


def test_cloudinary_without_keys_fails_loudly():
    settings = get_settings()
    settings.storage_backend = "cloudinary"
    for field in ("cloudinary_url", "cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret"):
        setattr(settings, field, "")
    storage_module.get_storage.cache_clear()
    with pytest.raises(RuntimeError, match="Cloudinary settings are missing"):
        storage_module.get_storage()


def test_unknown_backend_name_is_rejected():
    get_settings().storage_backend = "dropbox"
    storage_module.get_storage.cache_clear()
    with pytest.raises(RuntimeError, match="STORAGE_BACKEND"):
        storage_module.get_storage()


def test_cloudinary_url_setting_is_parsed():
    settings = get_settings()
    settings.cloudinary_url = "cloudinary://123456:abc%2Fdef@mycloud"
    assert settings.cloudinary_credentials == ("mycloud", "123456", "abc/def")
    settings.cloudinary_url = "https://not-cloudinary"
    settings.cloudinary_cloud_name = settings.cloudinary_api_key = settings.cloudinary_api_secret = ""
    assert settings.cloudinary_credentials is None


# ----- upload / delete through the admin API -----


def test_upload_goes_to_cloudinary_and_is_served_from_there(client, auth_headers, make_listing, cloud):
    lid = make_listing()["id"]
    before = {p.name for p in Path(get_settings().resolved_upload_dir).glob("*")}
    r = upload(client, auth_headers, lid, png("a.png"), ("b.jpg", image_bytes("JPEG"), "image/jpeg"))
    assert r.status_code == 201, r.text

    assert len(cloud["upload"]) == 2
    first = cloud["upload"][0]
    assert first["folder"] == "real-estate/properties" and first["resource_type"] == "image"
    assert first["overwrite"] is False and len(first["public_id"]) == 32
    assert first["bytes"].startswith(b"\x89PNG")  # the validated bytes are what gets uploaded

    photos = r.json()["photos"]
    assert all(p["url"].startswith(CLOUD_PREFIX) for p in photos)
    assert photos[0]["url"].endswith(".png") and photos[1]["url"].endswith(".jpg")
    assert "/real-estate/properties/" in photos[0]["url"]
    assert r.json()["cover_url"] == photos[0]["url"]
    assert {p.name for p in Path(get_settings().resolved_upload_dir).glob("*")} == before  # nothing on local disk

    public = client.get("/api/listings").json()["items"][0]
    assert public["cover_url"] == photos[0]["url"]


def test_invalid_files_are_still_rejected_and_never_uploaded(client, auth_headers, make_listing, cloud):
    lid = make_listing()["id"]
    r = upload(client, auth_headers, lid, png(), ("bad.png", b"not an image", "image/png"))
    assert r.status_code == 415
    assert cloud["upload"] == []  # validation happens before anything is sent to Cloudinary


def test_delete_photo_removes_it_from_cloudinary(client, auth_headers, make_listing, cloud):
    lid = make_listing()["id"]
    photos = upload(client, auth_headers, lid, png("a.png"), png("b.png")).json()["photos"]
    uploaded_ids = [f"real-estate/properties/{c['public_id']}" for c in cloud["upload"]]

    r = client.delete(f"{url(lid)}/{photos[0]['id']}", headers=auth_headers)
    assert r.status_code == 200 and len(r.json()["photos"]) == 1
    assert cloud["destroy"] == [uploaded_ids[0]]  # the public id, without the .png extension


def test_deleting_a_listing_removes_all_its_cloudinary_photos(client, auth_headers, make_listing, cloud):
    lid = make_listing()["id"]
    upload(client, auth_headers, lid, png("a.png"), png("b.png"))
    uploaded_ids = {f"real-estate/properties/{c['public_id']}" for c in cloud["upload"]}
    assert client.delete(f"/api/admin/listings/{lid}", headers=auth_headers).status_code == 204
    assert set(cloud["destroy"]) == uploaded_ids


def test_cloudinary_failure_midway_cleans_up_and_reports_502(client, auth_headers, make_listing, cloud):
    lid = make_listing()["id"]
    cloud["fail_on_upload_number"] = 2
    r = upload(client, auth_headers, lid, png("a.png"), png("b.png"), png("c.png"))
    assert r.status_code == 502
    assert "try again" in r.json()["detail"].lower() and "simulated" not in r.json()["detail"]
    assert len(cloud["upload"]) == 1 and len(cloud["destroy"]) == 1  # the one that did upload was removed again
    assert photos_of(client, auth_headers, lid) == []


def test_failed_cloudinary_delete_does_not_break_the_request(client, auth_headers, make_listing, cloud, monkeypatch):
    lid = make_listing()["id"]
    photos = upload(client, auth_headers, lid, png()).json()["photos"]

    def broken_destroy(*args, **kwargs):
        raise RuntimeError("Cloudinary is down")

    monkeypatch.setattr(cloudinary.uploader, "destroy", broken_destroy)
    r = client.delete(f"{url(lid)}/{photos[0]['id']}", headers=auth_headers)
    assert r.status_code == 200 and r.json()["photos"] == []


# ----- photos saved before Cloudinary was switched on -----


def test_old_local_photos_keep_working_after_switching(client, auth_headers, make_listing, cloud):
    listing = make_listing()
    local_file = Path(get_settings().resolved_upload_dir) / "legacy-photo.png"
    local_file.write_bytes(image_bytes("PNG"))
    with SessionLocal() as db:
        db.add(ListingPhoto(listing_id=listing["id"], file_path="legacy-photo.png", sort_order=0, is_cover=True))
        db.commit()

    detail = client.get(f"/api/listings/{listing['ref_code']}").json()
    assert detail["photos"][0]["url"] == "/uploads/legacy-photo.png"  # still served by the API, not Cloudinary

    photo_id = detail["photos"][0]["id"]
    assert client.delete(f"{url(listing['id'])}/{photo_id}", headers=auth_headers).status_code == 200
    assert cloud["destroy"] == []  # the old file is not a Cloudinary file
    assert not local_file.exists()
