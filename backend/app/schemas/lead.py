import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field, model_validator
from typing import Annotated

from app.schemas.common import blank_to_none, opt_text, req_text
from app.schemas.listing import PropertyType

Interest = Literal["buy", "rent"]
LeadStatus = Literal["new", "contacted", "visit_scheduled", "closed", "lost"]

_INDIAN_MOBILE = re.compile(r"^[6-9]\d{9}$")


def normalize_phone(value):
    """Accept '98765 43210', '+91-98765-43210', '09876543210' and return the 10 digits."""
    if not isinstance(value, str):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    digits = re.sub(r"[\s\-().]", "", value)
    if digits.startswith("+91"):
        digits = digits[3:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if not _INDIAN_MOBILE.match(digits):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return digits


Phone = Annotated[str, BeforeValidator(normalize_phone)]


class LeadIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: req_text(120, min_length=2)
    phone: Phone
    email: blank_to_none(EmailStr) = None
    interest: Interest
    property_type: blank_to_none(PropertyType) = None
    budget_text: opt_text(100) = None
    message: opt_text(2000) = None
    listing_id: int | None = Field(default=None, ge=1)


class LeadCreated(BaseModel):
    id: int
    detail: str


class LeadOut(BaseModel):
    id: int
    name: str
    phone: str
    email: str | None
    interest: str
    property_type: str | None
    budget_text: str | None
    message: str | None
    listing_id: int | None
    listing_ref: str | None
    listing_title: str | None
    source: str
    status: str
    owner_notes: str | None
    created_at: datetime


class LeadPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: LeadStatus | None = None
    owner_notes: opt_text(2000) = None

    @model_validator(mode="after")
    def _not_empty(self):
        if not self.model_fields_set:
            raise ValueError("Provide status and/or owner_notes")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("status cannot be null")
        return self


class StatsOut(BaseModel):
    listings: dict[str, int]
    leads_total: int
    leads_new: int
    leads_new_this_week: int
