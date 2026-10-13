from pydantic import BaseModel


class MonthDay(BaseModel):
    date: str  # YYYY-MM-DD
    day: int
    leads: int


class BusiestDay(BaseModel):
    day: int
    date: str
    leads: int


class MonthStats(BaseModel):
    """Enquiries received in one calendar month (in the business's local time zone)."""

    year: int
    month: int
    label: str  # "October 2026"
    today: int | None  # day number if this is the current month, else null
    days_in_month: int
    days: list[MonthDay]  # one entry per day, zero days included

    total: int
    today_leads: int
    previous_total: int  # the whole previous month
    previous_to_date: int  # previous month, only up to the same day of the month (fair comparison)
    previous_label: str  # "September"

    by_status: dict[str, int]
    new: int  # not contacted yet
    in_progress: int  # contacted + visit_scheduled
    open: int  # new + in_progress
    won: int  # closed
    lost: int
    win_rate: int | None  # won / (won + lost), whole percent; null until a lead is decided

    quiet_days: int  # days so far with no enquiry (today not counted)
    busiest_day: BusiestDay | None
    properties_added: int
