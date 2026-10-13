from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.config import get_settings
from app.deps import get_current_admin, get_db
from app.models import Listing, ListingPhoto
from app.schemas.listing import ListingDetail, ReorderIn
from app.services.images import InvalidImage, detect_extension
from app.services.listings import to_detail
from app.services.storage import get_storage

router = APIRouter(
    prefix="/api/admin/listings/{listing_id}/photos",
    tags=["admin-photos"],
    dependencies=[Depends(get_current_admin)],
)

MAX_PHOTOS_PER_LISTING = 20


def _get_listing(db: Session, listing_id: int) -> Listing:
    listing = db.scalar(
        select(Listing).where(Listing.id == listing_id).options(selectinload(Listing.photos))
    )
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    return listing


def _renumber(listing: Listing) -> None:
    """Keep sort_order 0..n-1 and make sure exactly one photo is the cover."""
    listing.photos.sort(key=lambda p: p.sort_order)
    for i, photo in enumerate(listing.photos):
        photo.sort_order = i
    if listing.photos and not any(p.is_cover for p in listing.photos):
        listing.photos[0].is_cover = True


@router.post("", response_model=ListingDetail, status_code=status.HTTP_201_CREATED)
def upload_photos(
    listing_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
):
    listing = _get_listing(db, listing_id)
    max_bytes = get_settings().max_upload_mb * 1024 * 1024

    if len(listing.photos) + len(files) > MAX_PHOTOS_PER_LISTING:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"A listing can have at most {MAX_PHOTOS_PER_LISTING} photos",
        )

    # Validate every file first so a bad one does not leave a half-finished upload behind.
    validated: list[tuple[bytes, str]] = []
    for upload in files:
        data = upload.file.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise HTTPException(
                status.HTTP_413_CONTENT_TOO_LARGE,
                f"'{upload.filename}' is larger than {get_settings().max_upload_mb} MB",
            )
        try:
            validated.append((data, detect_extension(data)))
        except InvalidImage as exc:
            raise HTTPException(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"'{upload.filename}': {exc}"
            ) from exc

    storage = get_storage()
    next_order = max((p.sort_order for p in listing.photos), default=-1) + 1
    for offset, (data, ext) in enumerate(validated):
        listing.photos.append(
            ListingPhoto(file_path=storage.save(data, ext), sort_order=next_order + offset)
        )
    _renumber(listing)
    db.commit()
    return to_detail(_get_listing(db, listing_id))


@router.put("/order", response_model=ListingDetail)
def reorder_photos(listing_id: int, body: ReorderIn, db: Session = Depends(get_db)):
    listing = _get_listing(db, listing_id)
    existing = {p.id for p in listing.photos}
    if len(body.photo_ids) != len(set(body.photo_ids)) or set(body.photo_ids) != existing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "photo_ids must list every photo of this listing exactly once",
        )
    position = {pid: i for i, pid in enumerate(body.photo_ids)}
    for photo in listing.photos:
        photo.sort_order = position[photo.id]
    _renumber(listing)
    db.commit()
    return to_detail(_get_listing(db, listing_id))


@router.patch("/{photo_id}/cover", response_model=ListingDetail)
def set_cover(listing_id: int, photo_id: int, db: Session = Depends(get_db)):
    listing = _get_listing(db, listing_id)
    if photo_id not in {p.id for p in listing.photos}:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    for photo in listing.photos:
        photo.is_cover = photo.id == photo_id
    db.commit()
    return to_detail(_get_listing(db, listing_id))


@router.delete("/{photo_id}", response_model=ListingDetail)
def delete_photo(listing_id: int, photo_id: int, db: Session = Depends(get_db)):
    listing = _get_listing(db, listing_id)
    photo = next((p for p in listing.photos if p.id == photo_id), None)
    if photo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Photo not found")
    key = photo.file_path
    listing.photos.remove(photo)  # delete-orphan removes the row
    _renumber(listing)
    db.commit()
    get_storage().delete(key)
    return to_detail(_get_listing(db, listing_id))
