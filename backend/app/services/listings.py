from uuid import uuid4

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import Select, or_
from sqlalchemy.orm import Session

from app.models import Listing
from app.schemas.listing import ListingCard, ListingDetail, ListingIn
from app.services.storage import get_storage


def escape_like(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def text_search(stmt: Select, text: str, *columns) -> Select:
    pattern = f"%{escape_like(text.strip())}%"
    return stmt.where(or_(*[c.ilike(pattern, escape="\\") for c in columns]))


def assign_ref_code(db: Session, listing: Listing) -> None:
    """DS-101, DS-102, ... derived from the primary key, so it is race-free and unique."""
    db.flush()
    listing.ref_code = f"DS-{100 + listing.id}"


def listing_values(data: ListingIn) -> dict:
    values = data.model_dump()
    values["description"] = values["description"] or ""
    return values


def new_listing(db: Session, data: ListingIn) -> Listing:
    listing = Listing(ref_code=f"tmp-{uuid4().hex[:12]}", **listing_values(data))
    db.add(listing)
    assign_ref_code(db, listing)
    return listing


def merge_patch(listing: Listing, patch: dict) -> ListingIn:
    """Apply a partial update onto the current values and re-validate the whole thing."""
    current = {name: getattr(listing, name) for name in ListingIn.model_fields}
    try:
        return ListingIn.model_validate({**current, **patch})
    except ValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            exc.errors(include_url=False, include_context=False, include_input=False),
        ) from exc


def cover_url(listing: Listing) -> str | None:
    if not listing.photos:
        return None
    cover = next((p for p in listing.photos if p.is_cover), listing.photos[0])
    return get_storage().url(cover.file_path)


def to_card(listing: Listing) -> ListingCard:
    card = ListingCard.model_validate(listing)
    card.cover_url = cover_url(listing)
    return card


def to_detail(listing: Listing) -> ListingDetail:
    detail = ListingDetail.model_validate(listing)
    detail.cover_url = cover_url(listing)
    return detail
