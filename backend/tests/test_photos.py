import io
from pathlib import Path

from PIL import Image

from app.config import get_settings


def image_bytes(fmt="PNG", size=(40, 30)):
    buf = io.BytesIO()
    Image.new("RGB", size, (10, 90, 100)).save(buf, fmt)
    return buf.getvalue()


def url(lid):
    return f"/api/admin/listings/{lid}/photos"


def upload(client, headers, lid, *files):
    return client.post(url(lid), files=[("files", f) for f in files], headers=headers)


def png(name="a.png"):
    return (name, image_bytes("PNG"), "image/png")


def upload_dir() -> Path:
    return get_settings().resolved_upload_dir


def photos_of(client, headers, lid):
    return client.get(f"/api/admin/listings/{lid}", headers=headers).json()["photos"]


def test_upload_requires_login(client, make_listing):
    lid = make_listing()["id"]
    assert client.post(url(lid), files=[("files", png())]).status_code == 401


def test_upload_valid_types_and_cover(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    r = upload(
        client,
        auth_headers,
        lid,
        ("a.jpg", image_bytes("JPEG"), "image/jpeg"),
        ("b.png", image_bytes("PNG"), "image/png"),
        ("c.webp", image_bytes("WEBP"), "image/webp"),
    )
    assert r.status_code == 201, r.text
    photos = r.json()["photos"]
    assert [p["sort_order"] for p in photos] == [0, 1, 2]
    assert [p["is_cover"] for p in photos] == [True, False, False]
    assert [p["url"].rsplit(".", 1)[1] for p in photos] == ["jpg", "png", "webp"]
    assert all(p["url"].startswith("/uploads/") for p in photos)
    assert r.json()["cover_url"] == photos[0]["url"]
    assert "file_path" not in photos[0]
    assert client.get(photos[0]["url"]).status_code == 200  # really served


def test_disguised_text_file_rejected(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    r = upload(client, auth_headers, lid, ("evil.jpg", b"<?php echo 'hi'; ?>", "image/jpeg"))
    assert r.status_code == 415
    assert photos_of(client, auth_headers, lid) == []


def test_real_image_of_disallowed_format_rejected(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    assert upload(client, auth_headers, lid, ("pic.jpg", image_bytes("GIF"), "image/jpeg")).status_code == 415
    assert upload(client, auth_headers, lid, ("pic.png", image_bytes("BMP"), "image/png")).status_code == 415


def test_svg_and_html_rejected(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    assert upload(client, auth_headers, lid, ("x.svg", svg, "image/svg+xml")).status_code == 415
    assert upload(client, auth_headers, lid, ("x.png", b"<html></html>", "image/png")).status_code == 415


def test_truncated_image_rejected(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    r = upload(client, auth_headers, lid, ("x.png", image_bytes("PNG")[:20], "image/png"))
    assert r.status_code == 415


def test_oversize_rejected(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    s = get_settings()
    old = s.max_upload_mb
    s.max_upload_mb = 1
    try:
        big = image_bytes("PNG") + b"\0" * (1024 * 1024 + 10)
        r = upload(client, auth_headers, lid, ("big.png", big, "image/png"))
    finally:
        s.max_upload_mb = old
    assert r.status_code == 413


def test_one_bad_file_saves_nothing(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    before = {p.name for p in upload_dir().glob("*")}
    r = upload(client, auth_headers, lid, png("good.png"), ("bad.png", b"nope", "image/png"))
    assert r.status_code == 415
    assert {p.name for p in upload_dir().glob("*")} == before
    assert photos_of(client, auth_headers, lid) == []


def test_unknown_listing_404(client, auth_headers):
    assert upload(client, auth_headers, 9999, png()).status_code == 404


def test_set_cover_and_reorder(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    photos = upload(client, auth_headers, lid, png("1.png"), png("2.png"), png("3.png")).json()["photos"]
    ids = [p["id"] for p in photos]

    r = client.patch(f"{url(lid)}/{ids[2]}/cover", headers=auth_headers)
    assert r.status_code == 200
    assert [p["is_cover"] for p in r.json()["photos"]] == [False, False, True]

    r = client.put(f"{url(lid)}/order", json={"photo_ids": [ids[2], ids[0], ids[1]]}, headers=auth_headers)
    assert r.status_code == 200
    assert [p["id"] for p in r.json()["photos"]] == [ids[2], ids[0], ids[1]]
    assert [p["sort_order"] for p in r.json()["photos"]] == [0, 1, 2]

    for bad in ([ids[0]], [ids[0], ids[0], ids[1]], [ids[0], ids[1], 99999]):
        r = client.put(f"{url(lid)}/order", json={"photo_ids": bad}, headers=auth_headers)
        assert r.status_code == 422
    assert client.patch(f"{url(lid)}/99999/cover", headers=auth_headers).status_code == 404


def test_delete_photo_promotes_new_cover_and_removes_file(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    photos = upload(client, auth_headers, lid, png("1.png"), png("2.png")).json()["photos"]
    first_file = upload_dir() / Path(photos[0]["url"]).name
    assert first_file.exists()

    r = client.delete(f"{url(lid)}/{photos[0]['id']}", headers=auth_headers)
    assert r.status_code == 200
    remaining = r.json()["photos"]
    assert len(remaining) == 1 and remaining[0]["id"] == photos[1]["id"]
    assert remaining[0]["is_cover"] is True and remaining[0]["sort_order"] == 0
    assert not first_file.exists()
    assert client.delete(f"{url(lid)}/{photos[0]['id']}", headers=auth_headers).status_code == 404


def test_deleting_listing_removes_files(client, auth_headers, make_listing):
    lid = make_listing()["id"]
    photos = upload(client, auth_headers, lid, png()).json()["photos"]
    f = upload_dir() / Path(photos[0]["url"]).name
    assert f.exists()
    client.delete(f"/api/admin/listings/{lid}", headers=auth_headers)
    assert not f.exists()


def test_public_listing_exposes_cover(client, auth_headers, make_listing):
    listing = make_listing()
    upload(client, auth_headers, listing["id"], png())
    card = client.get("/api/listings").json()["items"][0]
    assert card["cover_url"].startswith("/uploads/")
    detail = client.get(f"/api/listings/{listing['ref_code']}").json()
    assert len(detail["photos"]) == 1
