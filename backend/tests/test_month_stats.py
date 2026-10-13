from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import Lead, Listing

URL = "/api/admin/stats/month"


def add_lead(created_utc: datetime, status: str = "new", name: str = "Test") -> None:
    with SessionLocal() as db:
        db.add(
            Lead(
                name=name,
                phone="9876543210",
                interest="buy",
                status=status,
                created_at=created_utc,
            )
        )
        db.commit()


def test_requires_login(client):
    assert client.get(URL).status_code == 401


def test_invalid_month_rejected(client, auth_headers):
    assert client.get(URL, params={"year": 2026, "month": 13}, headers=auth_headers).status_code == 422
    assert client.get(URL, params={"year": 1999, "month": 1}, headers=auth_headers).status_code == 422


def test_days_are_counted_in_indian_time(client, auth_headers):
    # IST is UTC+5:30, so these UTC times fall on different local days than their UTC date.
    add_lead(datetime(2026, 2, 28, 18, 30))  # = 1 Mar 00:00 IST -> day 1
    add_lead(datetime(2026, 3, 12, 19, 0))  # = 13 Mar 00:30 IST -> day 13
    add_lead(datetime(2026, 3, 31, 18, 29))  # = 31 Mar 23:59 IST -> day 31
    add_lead(datetime(2026, 3, 31, 18, 30))  # = 1 Apr 00:00 IST -> next month
    add_lead(datetime(2026, 2, 10, 8, 0))  # February: counts as "previous month"

    body = client.get(URL, params={"year": 2026, "month": 3}, headers=auth_headers).json()
    assert body["label"] == "March 2026" and body["days_in_month"] == 31
    assert len(body["days"]) == 31 and body["days"][0]["date"] == "2026-03-01"
    by_day = {d["day"]: d["leads"] for d in body["days"]}
    assert by_day[1] == 1 and by_day[13] == 1 and by_day[31] == 1
    assert sum(by_day.values()) == body["total"] == 3
    assert body["previous_total"] == 1 and body["previous_label"] == "February"
    assert body["today"] is None  # not the current month
    assert body["busiest_day"]["leads"] == 1


def test_outcomes_and_win_rate(client, auth_headers):
    base = datetime(2026, 5, 3, 6, 0)
    for i, status in enumerate(["new", "new", "contacted", "visit_scheduled", "closed", "closed", "closed", "lost"]):
        add_lead(base + timedelta(days=i), status)
    body = client.get(URL, params={"year": 2026, "month": 5}, headers=auth_headers).json()
    assert body["total"] == 8
    assert body["by_status"] == {"new": 2, "contacted": 1, "visit_scheduled": 1, "closed": 3, "lost": 1}
    assert (body["new"], body["in_progress"], body["open"], body["won"], body["lost"]) == (2, 2, 4, 3, 1)
    assert body["win_rate"] == 75  # 3 won of 4 decided


def test_win_rate_is_null_until_a_lead_is_decided(client, auth_headers):
    add_lead(datetime(2026, 5, 3, 6, 0), "new")
    body = client.get(URL, params={"year": 2026, "month": 5}, headers=auth_headers).json()
    assert body["win_rate"] is None and body["won"] == 0 and body["lost"] == 0


def test_quiet_days_for_a_finished_month(client, auth_headers):
    add_lead(datetime(2026, 5, 3, 6, 0))
    add_lead(datetime(2026, 5, 3, 7, 0))
    add_lead(datetime(2026, 5, 20, 6, 0))
    body = client.get(URL, params={"year": 2026, "month": 5}, headers=auth_headers).json()
    assert body["quiet_days"] == 31 - 2  # two days had enquiries
    assert body["busiest_day"] == {"day": 3, "date": "2026-05-03", "leads": 2}


def test_future_month_has_no_quiet_days(client, auth_headers):
    body = client.get(URL, params={"year": 2099, "month": 1}, headers=auth_headers).json()
    assert body["total"] == 0 and body["quiet_days"] == 0 and body["busiest_day"] is None


def test_defaults_to_current_month(client, auth_headers):
    add_lead(datetime.now(timezone.utc).replace(tzinfo=None), "new")
    body = client.get(URL, headers=auth_headers).json()
    assert body["today"] is not None and body["today_leads"] >= 1
    assert str(datetime.now().year) in body["label"]
    assert body["total"] >= 1


def test_properties_added_this_month(client, auth_headers, make_listing):
    make_listing()
    make_listing()
    body = client.get(URL, headers=auth_headers).json()
    assert body["properties_added"] == 2
    assert client.get(URL, params={"year": 2020, "month": 1}, headers=auth_headers).json()["properties_added"] == 0


def test_previous_month_is_compared_up_to_the_same_day(client, auth_headers):
    from datetime import date

    today_local = client.get(URL, headers=auth_headers).json()["today"]
    prev_year, prev_month = (date.today().year - 1, 12) if date.today().month == 1 else (date.today().year, date.today().month - 1)
    # Noon UTC on day 1 and day 28 of last month: 17:30 IST, so the same local day
    add_lead(datetime(prev_year, prev_month, 1, 6, 30))
    add_lead(datetime(prev_year, prev_month, 28, 6, 30))
    body = client.get(URL, headers=auth_headers).json()
    assert body["previous_total"] == 2
    assert body["previous_to_date"] == (1 if today_local < 28 else 2)


def test_previous_to_date_equals_total_for_a_finished_month(client, auth_headers):
    add_lead(datetime(2026, 2, 3, 6, 30))
    add_lead(datetime(2026, 2, 27, 6, 30))
    body = client.get(URL, params={"year": 2026, "month": 3}, headers=auth_headers).json()
    assert body["previous_total"] == 2 and body["previous_to_date"] == 2
