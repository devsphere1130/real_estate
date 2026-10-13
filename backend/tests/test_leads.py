import pytest

from app.config import get_settings

LEADS = "/api/leads"
ADMIN = "/api/admin/leads"


def lead(**overrides):
    base = {"name": "Ravi Kumar", "phone": "9876543210", "interest": "buy"}
    base.update(overrides)
    return base


def first_lead(client, headers):
    return client.get(ADMIN, headers=headers).json()["items"][0]


def test_create_lead_minimal(client, auth_headers):
    r = client.post(LEADS, json=lead())
    assert r.status_code == 201
    assert r.json()["id"]
    saved = first_lead(client, auth_headers)
    assert saved["status"] == "new" and saved["source"] == "website_form"
    assert saved["phone"] == "9876543210"


@pytest.mark.parametrize(
    "typed",
    ["9876543210", "98765 43210", "+91 98765 43210", "+91-98765-43210", "919876543210", "09876543210"],
)
def test_phone_formats_are_normalised(client, auth_headers, typed):
    assert client.post(LEADS, json=lead(phone=typed)).status_code == 201
    assert first_lead(client, auth_headers)["phone"] == "9876543210"


@pytest.mark.parametrize(
    "bad",
    ["", "12345", "98765432", "98765432101", "5876543210", "abcdefghij", "+1 9876543210", "98765-4321x"],
)
def test_invalid_phone_rejected(client, bad):
    assert client.post(LEADS, json=lead(phone=bad)).status_code == 422


def test_other_validation(client):
    assert client.post(LEADS, json=lead(name="")).status_code == 422
    assert client.post(LEADS, json=lead(name="A")).status_code == 422
    assert client.post(LEADS, json=lead(interest="lease")).status_code == 422
    assert client.post(LEADS, json=lead(email="not-an-email")).status_code == 422
    assert client.post(LEADS, json=lead(property_type="castle")).status_code == 422
    assert client.post(LEADS, json=lead(message="x" * 2001)).status_code == 422
    assert client.post(LEADS, json={"phone": "9876543210"}).status_code == 422


def test_blank_optional_fields_become_null(client, auth_headers):
    r = client.post(LEADS, json=lead(email="", property_type="", budget_text="", message="  "))
    assert r.status_code == 201
    saved = first_lead(client, auth_headers)
    assert saved["email"] is None and saved["property_type"] is None and saved["message"] is None


def test_html_stripped_from_lead_text(client, auth_headers):
    client.post(LEADS, json=lead(message="Hello <img src=x onerror=alert(1)> there"))
    assert "<" not in first_lead(client, auth_headers)["message"]


def test_lead_for_listing(client, auth_headers, make_listing):
    listing = make_listing()
    assert client.post(LEADS, json=lead(listing_id=listing["id"])).status_code == 201
    saved = first_lead(client, auth_headers)
    assert saved["source"] == "listing_page"
    assert saved["listing_ref"] == listing["ref_code"]
    assert saved["listing_title"] == listing["title"]


def test_lead_for_missing_or_hidden_listing(client, make_listing):
    assert client.post(LEADS, json=lead(listing_id=9999)).status_code == 404
    hidden = make_listing(status="hidden")
    assert client.post(LEADS, json=lead(listing_id=hidden["id"])).status_code == 404


def test_rate_limit_per_ip(client):
    s = get_settings()
    old = s.lead_rate_limit
    s.lead_rate_limit = 3
    try:
        codes = [client.post(LEADS, json=lead()).status_code for _ in range(5)]
    finally:
        s.lead_rate_limit = old
    assert codes == [201, 201, 201, 429, 429]


def test_rate_limit_response_has_retry_after(client):
    s = get_settings()
    old = s.lead_rate_limit
    s.lead_rate_limit = 1
    try:
        client.post(LEADS, json=lead())
        r = client.post(LEADS, json=lead())
    finally:
        s.lead_rate_limit = old
    assert r.status_code == 429 and int(r.headers["retry-after"]) > 0


def test_admin_leads_require_login(client):
    assert client.get(ADMIN).status_code == 401
    assert client.patch(f"{ADMIN}/1", json={"status": "closed"}).status_code == 401
    assert client.delete(f"{ADMIN}/1").status_code == 401


def names(client, headers, **params):
    return [i["name"] for i in client.get(ADMIN, params=params, headers=headers).json()["items"]]


def test_admin_filter_search_update_delete(client, auth_headers):
    client.post(LEADS, json=lead(name="Alice", phone="9111111111"))
    client.post(LEADS, json=lead(name="Bob", phone="9222222222"))
    assert names(client, auth_headers) == ["Bob", "Alice"]  # newest first
    assert names(client, auth_headers, q="ali") == ["Alice"]
    assert names(client, auth_headers, q="92222") == ["Bob"]

    bob = first_lead(client, auth_headers)["id"]
    r = client.patch(
        f"{ADMIN}/{bob}",
        json={"status": "contacted", "owner_notes": "Called, wants a visit"},
        headers=auth_headers,
    )
    assert r.status_code == 200 and r.json()["status"] == "contacted"
    assert r.json()["owner_notes"] == "Called, wants a visit"

    assert names(client, auth_headers, status="contacted") == ["Bob"]
    assert names(client, auth_headers, status="new") == ["Alice"]

    r = client.patch(f"{ADMIN}/{bob}", json={"owner_notes": ""}, headers=auth_headers)
    assert r.json()["owner_notes"] is None  # notes can be cleared

    assert client.patch(f"{ADMIN}/{bob}", json={"status": "bogus"}, headers=auth_headers).status_code == 422
    assert client.patch(f"{ADMIN}/{bob}", json={}, headers=auth_headers).status_code == 422
    assert client.patch(f"{ADMIN}/9999", json={"status": "closed"}, headers=auth_headers).status_code == 404

    assert client.delete(f"{ADMIN}/{bob}", headers=auth_headers).status_code == 204
    assert names(client, auth_headers) == ["Alice"]


def test_deleting_listing_keeps_lead(client, auth_headers, make_listing):
    listing = make_listing()
    client.post(LEADS, json=lead(listing_id=listing["id"]))
    assert client.delete(f"/api/admin/listings/{listing['id']}", headers=auth_headers).status_code == 204
    saved = first_lead(client, auth_headers)
    assert saved["listing_id"] is None and saved["listing_ref"] is None
