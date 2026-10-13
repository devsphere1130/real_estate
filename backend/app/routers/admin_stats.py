import calendar
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone as dt_timezone, tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.deps import get_current_admin, get_db
from app.models import Lead, Listing, utcnow
from app.schemas.lead import StatsOut
from app.schemas.stats import BusiestDay, MonthDay, MonthStats

logger = logging.getLogger("devsphere")

router = APIRouter(
    prefix="/api/admin/stats",
    tags=["admin-stats"],
    dependencies=[Depends(get_current_admin)],
)

LISTING_STATUSES = ("available", "sold", "rented", "hidden")
LEAD_STATUSES = ("new", "contacted", "visit_scheduled", "closed", "lost")


@router.get("", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Listing.status, func.count()).group_by(Listing.status)).all())
    listings = {s: counts.get(s, 0) for s in LISTING_STATUSES}
    listings["total"] = sum(listings.values())

    week_ago = utcnow() - timedelta(days=7)
    return StatsOut(
        listings=listings,
        leads_total=db.scalar(select(func.count()).select_from(Lead)) or 0,
        leads_new=db.scalar(select(func.count()).select_from(Lead).where(Lead.status == "new")) or 0,
        leads_new_this_week=db.scalar(
            select(func.count()).select_from(Lead).where(Lead.created_at >= week_ago)
        )
        or 0,
    )


def _local_tz() -> tzinfo:
    name = get_settings().timezone
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        logger.warning("Time zone %r not found (is the 'tzdata' package installed?). Using UTC.", name)
        return dt_timezone.utc


def _month_bounds_utc(year: int, month: int, tz: tzinfo) -> tuple[datetime, datetime]:
    """Start (inclusive) and end (exclusive) of a local calendar month as naive UTC, like the database."""
    next_year, next_month = (year + 1, 1) if month == 12 else (year, month + 1)

    def to_utc(d: datetime) -> datetime:
        return d.astimezone(dt_timezone.utc).replace(tzinfo=None)

    return to_utc(datetime(year, month, 1, tzinfo=tz)), to_utc(datetime(next_year, next_month, 1, tzinfo=tz))


@router.get("/month", response_model=MonthStats)
def month_stats(
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    """Enquiries per day and how they turned out for one month (default: the current month)."""
    tz = _local_tz()
    now = datetime.now(tz)
    year = year or now.year
    month = month or now.month
    days_in_month = calendar.monthrange(year, month)[1]

    start, end = _month_bounds_utc(year, month, tz)
    prev_year, prev_month = (year - 1, 12) if month == 1 else (year, month - 1)
    prev_start, prev_end = _month_bounds_utc(prev_year, prev_month, tz)

    rows = db.execute(select(Lead.created_at, Lead.status).where(Lead.created_at >= start, Lead.created_at < end)).all()
    per_day = [0] * (days_in_month + 1)
    by_status = Counter()
    for created_at, status in rows:
        local = created_at.replace(tzinfo=dt_timezone.utc).astimezone(tz)
        per_day[local.day] += 1
        by_status[status] += 1

    prev_created = db.scalars(select(Lead.created_at).where(Lead.created_at >= prev_start, Lead.created_at < prev_end)).all()
    previous_total = len(prev_created)
    properties_added = (
        db.scalar(select(func.count()).select_from(Listing).where(Listing.created_at >= start, Listing.created_at < end)) or 0
    )

    is_current = (year, month) == (now.year, now.month)
    is_past = (year, month) < (now.year, now.month)
    today = now.day if is_current else None
    # Days that are over: all of a past month, days before today in the current month, none in the future.
    finished_days = days_in_month if is_past else (now.day - 1 if is_current else 0)

    # Compare like with like: last month only up to the same day of the month as today.
    cutoff = now.day if is_current else (days_in_month if is_past else 0)
    previous_to_date = sum(
        1 for c in prev_created if c.replace(tzinfo=dt_timezone.utc).astimezone(tz).day <= cutoff
    )

    days = [
        MonthDay(date=f"{year}-{month:02d}-{d:02d}", day=d, leads=per_day[d]) for d in range(1, days_in_month + 1)
    ]
    busiest = max(days, key=lambda d: d.leads)
    status_counts = {s: by_status.get(s, 0) for s in LEAD_STATUSES}
    won, lost = status_counts["closed"], status_counts["lost"]
    in_progress = status_counts["contacted"] + status_counts["visit_scheduled"]

    return MonthStats(
        year=year,
        month=month,
        label=f"{calendar.month_name[month]} {year}",
        today=today,
        days_in_month=days_in_month,
        days=days,
        total=sum(per_day),
        today_leads=per_day[today] if today else 0,
        previous_total=previous_total,
        previous_to_date=previous_to_date,
        previous_label=calendar.month_name[prev_month],
        by_status=status_counts,
        new=status_counts["new"],
        in_progress=in_progress,
        open=status_counts["new"] + in_progress,
        won=won,
        lost=lost,
        win_rate=round(100 * won / (won + lost)) if (won + lost) else None,
        quiet_days=sum(1 for d in range(1, finished_days + 1) if per_day[d] == 0),
        busiest_day=BusiestDay(day=busiest.day, date=busiest.date, leads=busiest.leads) if busiest.leads else None,
        properties_added=properties_added,
    )
