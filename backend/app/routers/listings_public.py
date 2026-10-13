from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_db
from app.models import Listing
from app.schemas.common import Page, make_page
from app.schemas.listing import ListingCard, ListingDetail, Kind, PropertyType
from app.services.listings import text_search, to_card, to_detail

router = APIRouter(prefix="/api/listings", tags=["listings"])

Sort = Literal["newest", "price_asc", "price_desc"]


@router.get("", response_model=Page[ListingCard])
def list_listings(
    kind: Kind | None = None,
    property_type: PropertyType | None = None,
    q: str | None = Query(None, max_length=100, description="Search locality, city or title"),
    min_price: int | None = Query(None, ge=0),
    max_price: int | None = Query(None, ge=0),
    bedrooms: int | None = Query(None, ge=0, le=20, description="Minimum number of bedrooms"),
    featured: bool | None = None,
    sort: Sort = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    stmt = select(Listing).where(Listing.status == "available")
    if kind:
        stmt = stmt.where(Listing.kind == kind)
    if property_type:
        stmt = stmt.where(Listing.property_type == property_type)
    if q and q.strip():
        stmt = text_search(stmt, q, Listing.locality, Listing.city, Listing.title)
    if min_price is not None:
        stmt = stmt.where(Listing.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Listing.price <= max_price)
    if bedrooms is not None:
        stmt = stmt.where(Listing.bedrooms >= bedrooms)
    if featured is not None:
        stmt = stmt.where(Listing.is_featured == featured)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    order = {
        "newest": (Listing.created_at.desc(), Listing.id.desc()),
        "price_asc": (Listing.price.asc(), Listing.id.desc()),
        "price_desc": (Listing.price.desc(), Listing.id.desc()),
    }[sort]
    rows = db.scalars(
        stmt.options(selectinload(Listing.photos))
        .order_by(*order)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return make_page([to_card(r) for r in rows], total, page, page_size)


@router.get("/{ref_code}", response_model=ListingDetail)
def get_listing(ref_code: str, db: Session = Depends(get_db)):
    listing = db.scalar(
        select(Listing)
        .where(Listing.ref_code == ref_code.upper(), Listing.status != "hidden")
        .options(selectinload(Listing.photos))
    )
    if listing is None:
        raise HTTPException(404, "Listing not found")
    return to_detail(listing)
