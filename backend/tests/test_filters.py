import pytest

API = "/api/listings"


@pytest.fixture
def catalog(make_listing):
    make_listing(title="Cheap flat", price=3_000_000, bedrooms=1, locality="Mansarovar")
    make_listing(title="Mid flat", price=6_000_000, bedrooms=2, locality="Vaishali Nagar")
    make_listing(title="Big villa", property_type="villa", price=20_000_000, bedrooms=4, locality="Mansarovar")
    make_listing(title="Rental flat", kind="rent", price=14_000, bedrooms=2, locality="Malviya Nagar")
    make_listing(title="Sold flat", status="sold", price=5_000_000, bedrooms=2)
    make_listing(title="Hidden flat", status="hidden")
    make_listing(title="Plot", property_type="plot", price=4_000_000, bedrooms=None, carpet_area_sqft=1800)


def titles(r):
    assert r.status_code == 200, r.text
    return [i["title"] for i in r.json()["items"]]


def test_only_available_listings_are_public(client, catalog):
    body = client.get(API, params={"page_size": 50}).json()
    assert body["total"] == 5
    got = titles(client.get(API))
    assert "Sold flat" not in got and "Hidden flat" not in got


def test_filter_by_kind_and_type(client, catalog):
    assert titles(client.get(API, params={"kind": "rent"})) == ["Rental flat"]
    assert titles(client.get(API, params={"property_type": "villa"})) == ["Big villa"]
    got = titles(client.get(API, params={"kind": "sale", "property_type": "flat"}))
    assert set(got) == {"Cheap flat", "Mid flat"}


def test_filter_by_price_range(client, catalog):
    got = titles(client.get(API, params={"kind": "sale", "min_price": 3_500_000, "max_price": 7_000_000}))
    assert set(got) == {"Mid flat", "Plot"}


def test_filter_by_bedrooms_is_minimum(client, catalog):
    got = titles(client.get(API, params={"bedrooms": 2}))
    assert set(got) == {"Mid flat", "Big villa", "Rental flat"}


def test_locality_search_is_case_insensitive(client, catalog):
    assert set(titles(client.get(API, params={"q": "mansarovar"}))) == {"Cheap flat", "Big villa"}
    assert titles(client.get(API, params={"q": "nowhere-land"})) == []


def test_sorting(client, catalog):
    sale = {"kind": "sale"}
    asc = titles(client.get(API, params={**sale, "sort": "price_asc"}))
    assert asc == ["Cheap flat", "Plot", "Mid flat", "Big villa"]
    desc = titles(client.get(API, params={**sale, "sort": "price_desc"}))
    assert desc == list(reversed(asc))
    newest = titles(client.get(API, params={**sale, "sort": "newest"}))
    assert newest[0] == "Plot"


def test_pagination(client, catalog):
    p1 = client.get(API, params={"page_size": 2, "page": 1, "sort": "price_asc"}).json()
    p3 = client.get(API, params={"page_size": 2, "page": 3, "sort": "price_asc"}).json()
    assert p1["total"] == 5 and p1["pages"] == 3 and len(p1["items"]) == 2
    assert len(p3["items"]) == 1
    assert client.get(API, params={"page": 99}).json()["items"] == []


def test_invalid_params_rejected(client):
    assert client.get(API, params={"sort": "random"}).status_code == 422
    assert client.get(API, params={"kind": "lease"}).status_code == 422
    assert client.get(API, params={"page": 0}).status_code == 422
    assert client.get(API, params={"page_size": 500}).status_code == 422


def test_featured_filter(client, make_listing):
    make_listing(title="Star", is_featured=True)
    make_listing(title="Plain")
    assert titles(client.get(API, params={"featured": True})) == ["Star"]
