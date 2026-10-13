from tests.conftest import listing_payload

ADMIN = "/api/admin/listings"


def test_admin_endpoints_require_login(client):
    assert client.get(ADMIN).status_code == 401
    assert client.post(ADMIN, json=listing_payload()).status_code == 401
    assert client.put(f"{ADMIN}/1", json=listing_payload()).status_code == 401
    assert client.delete(f"{ADMIN}/1").status_code == 401
    assert client.get("/api/admin/stats").status_code == 401


def test_create_listing_generates_ref_codes(client, auth_headers):
    first = client.post(ADMIN, json=listing_payload(), headers=auth_headers).json()
    second = client.post(ADMIN, json=listing_payload(), headers=auth_headers).json()
    assert first["ref_code"].startswith("DS-")
    assert first["ref_code"] != second["ref_code"]
    assert first["status"] == "available"
    assert first["amenities"] == ["Lift", "Parking"]
    assert first["photos"] == []


def test_create_validation_errors(client, auth_headers):
    bad = [
        listing_payload(price=0),
        listing_payload(kind="lease"),
        listing_payload(property_type="castle"),
        listing_payload(carpet_area_sqft=-5),
        listing_payload(floor=9, total_floors=3),
        listing_payload(kind="rent", status="sold"),
        listing_payload(kind="sale", status="rented"),
        listing_payload(title="   "),
        listing_payload(unknown_field=1),
    ]
    for payload in bad:
        r = client.post(ADMIN, json=payload, headers=auth_headers)
        assert r.status_code == 422, payload


def test_html_is_stripped_from_text(client, auth_headers):
    r = client.post(
        ADMIN,
        json=listing_payload(title="Nice <script>alert(1)</script>flat", description="<b>Hi</b>"),
        headers=auth_headers,
    )
    assert r.status_code == 201
    assert "<" not in r.json()["title"]
    assert r.json()["description"] == "Hi"


def test_get_update_delete(client, auth_headers, make_listing):
    created = make_listing()
    lid = created["id"]

    got = client.get(f"{ADMIN}/{lid}", headers=auth_headers)
    assert got.status_code == 200 and got.json()["title"] == created["title"]

    r = client.put(
        f"{ADMIN}/{lid}", json=listing_payload(title="Renamed flat", price=7_000_000), headers=auth_headers
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Renamed flat" and r.json()["price"] == 7_000_000
    assert r.json()["ref_code"] == created["ref_code"]

    assert client.delete(f"{ADMIN}/{lid}", headers=auth_headers).status_code == 204
    assert client.get(f"{ADMIN}/{lid}", headers=auth_headers).status_code == 404
    assert client.delete(f"{ADMIN}/{lid}", headers=auth_headers).status_code == 404


def test_patch_status_quick_actions(client, auth_headers, make_listing):
    sale = make_listing()
    r = client.patch(f"{ADMIN}/{sale['id']}", json={"status": "sold"}, headers=auth_headers)
    assert r.status_code == 200 and r.json()["status"] == "sold"
    # A sale cannot be marked rented
    r = client.patch(f"{ADMIN}/{sale['id']}", json={"status": "rented"}, headers=auth_headers)
    assert r.status_code == 422

    rent = make_listing(kind="rent", price=14000)
    r = client.patch(f"{ADMIN}/{rent['id']}", json={"status": "rented"}, headers=auth_headers)
    assert r.status_code == 200

    assert client.patch(f"{ADMIN}/{sale['id']}", json={}, headers=auth_headers).status_code == 422


def test_admin_list_shows_all_statuses_and_searches(client, auth_headers, make_listing):
    make_listing(title="Alpha house", locality="Mansarovar")
    make_listing(title="Beta house", locality="Vaishali", status="hidden")
    r = client.get(ADMIN, headers=auth_headers)
    assert r.json()["total"] == 2

    r = client.get(ADMIN, params={"status": "hidden"}, headers=auth_headers)
    assert [i["title"] for i in r.json()["items"]] == ["Beta house"]

    r = client.get(ADMIN, params={"q": "mansa"}, headers=auth_headers)
    assert [i["title"] for i in r.json()["items"]] == ["Alpha house"]


def test_search_treats_percent_literally(client, auth_headers, make_listing):
    make_listing(locality="Normal Colony")
    r = client.get(ADMIN, params={"q": "%"}, headers=auth_headers)
    assert r.json()["total"] == 0


def test_public_detail_and_hidden(client, make_listing):
    visible = make_listing()
    hidden = make_listing(status="hidden")
    r = client.get(f"/api/listings/{visible['ref_code']}")
    assert r.status_code == 200 and r.json()["ref_code"] == visible["ref_code"]
    assert client.get(f"/api/listings/{visible['ref_code'].lower()}").status_code == 200
    assert client.get(f"/api/listings/{hidden['ref_code']}").status_code == 404
    assert client.get("/api/listings/DS-99999").status_code == 404


def test_stats(client, auth_headers, make_listing):
    make_listing()
    make_listing(status="hidden")
    make_listing(kind="rent", status="rented")
    client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210", "interest": "buy"})
    r = client.get("/api/admin/stats", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["listings"] == {"available": 1, "sold": 0, "rented": 1, "hidden": 1, "total": 3}
    assert body["leads_total"] == 1 and body["leads_new"] == 1 and body["leads_new_this_week"] == 1
