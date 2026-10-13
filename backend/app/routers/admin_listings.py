from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.deps import get_current_admin, get_db
from app.models import Listing
from app.schemas.common import Page, make_page
from app.schemas.listing import Kind, ListingDetail, ListingIn, ListingPatch, PropertyType, Status
from app.services.listings import (
    listing_values,
    merge_patch,
    new_listing,
    text_search,
    to_detail,
)
from app.services.storage import get_storage

router = APIRouter(
    prefix="/api/admin/listings",
    tags=["admin-listings"],
    dependencies=[Depends(get_current_admin)],
)


def _get_or_404(db: Session, listing_id: int) -> Listing:
    listing = db.scalar(
        select(Listing).where(Listing.id == listing_id).options(selectinload(Listing.photos))
    )
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    return listing


@router.get("", response_model=Page[ListingDetail])
def list_all(
    q: str | None = Query(None, max_length=100, description="Search ref code, title, locality or city"),
    status_: Status | None = Query(None, alias="status"),
    kind: Kind | None = None,
    property_type: PropertyType | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(Listing)
    if status_:
        stmt = stmt.where(Listing.status == status_)
    if kind:
        stmt = stmt.where(Listing.kind == kind)
    if property_type:
        stmt = stmt.where(Listing.property_type == property_type)
    if q and q.strip():
        stmt = text_search(stmt, q, Listing.ref_code, Listing.title, Listing.locality, Listing.city)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(selectinload(Listing.photos))
        .order_by(Listing.created_at.desc(), Listing.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return make_page([to_detail(r) for r in rows], total, page, page_size)


@router.get("/{listing_id}", response_model=ListingDetail)
def get_one(listing_id: int, db: Session = Depends(get_db)):
    return to_detail(_get_or_404(db, listing_id))


@router.post("", response_model=ListingDetail, status_code=status.HTTP_201_CREATED)
def create(data: ListingIn, db: Session = Depends(get_db)):
    listing = new_listing(db, data)
    db.commit()
    return to_detail(_get_or_404(db, listing.id))


@router.put("/{listing_id}", response_model=ListingDetail)
def replace(listing_id: int, data: ListingIn, db: Session = Depends(get_db)):
    listing = _get_or_404(db, listing_id)
    for name, value in listing_values(data).items():
        setattr(listing, name, value)
    db.commit()
    return to_detail(_get_or_404(db, listing_id))


@router.patch("/{listing_id}", response_model=ListingDetail)
def update_partial(listing_id: int, patch: ListingPatch, db: Session = Depends(get_db)):
    """Partial update, e.g. {"status": "sold"} for the quick actions in the admin panel."""
    listing = _get_or_404(db, listing_id)
    changes = patch.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "No fields to update")
    for name, value in listing_values(merge_patch(listing, changes)).items():
        setattr(listing, name, value)
    db.commit()
    return to_detail(_get_or_404(db, listing_id))


@router.delete("/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(listing_id: int, db: Session = Depends(get_db)):
    listing = _get_or_404(db, listing_id)
    keys = [p.file_path for p in listing.photos]
    db.delete(listing)  # photo rows cascade; leads keep their data (listing_id becomes NULL)
    db.commit()
    storage = get_storage()
    for key in keys:
        storage.delete(key)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
