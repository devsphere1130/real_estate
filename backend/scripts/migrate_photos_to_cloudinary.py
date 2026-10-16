"""Move photos that were saved in the local uploads folder to Cloudinary and update the database.

Run this once after switching on Cloudinary. It is safe to run again: photos that are already on Cloudinary
are skipped, and the local files are NOT deleted (use --delete-local when you are happy with the result).

Usage (from /backend):
    python -m scripts.migrate_photos_to_cloudinary --dry-run      # only show what would happen
    python -m scripts.migrate_photos_to_cloudinary
    python -m scripts.migrate_photos_to_cloudinary --delete-local

DATABASE_URL in .env decides which database is updated, so point it at the database your website uses.
"""
import argparse
import sys
from pathlib import Path

from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import ListingPhoto
from app.services.storage import CloudinaryStorage, StorageError, get_storage


def main() -> int:
    parser = argparse.ArgumentParser(description="Move local listing photos to Cloudinary")
    parser.add_argument("--dry-run", action="store_true", help="show what would be moved, change nothing")
    parser.add_argument("--delete-local", action="store_true", help="delete each local file after it was moved")
    args = parser.parse_args()

    storage = get_storage()
    if not isinstance(storage, CloudinaryStorage):
        print("Cloudinary storage is not active. Set the Cloudinary keys in backend/.env first")
        print("(then run `python -m scripts.check_cloudinary` to test them).")
        return 1

    local_dir = get_settings().resolved_upload_dir
    moved = skipped = failed = 0
    with SessionLocal() as db:
        photos = db.scalars(select(ListingPhoto).order_by(ListingPhoto.id)).all()
        for photo in photos:
            key = photo.file_path
            if "/" in key:  # already a Cloudinary key
                skipped += 1
                continue
            path = local_dir / Path(key).name
            if not path.is_file():
                print(f"  missing  photo #{photo.id}: {path} not found, left as it is")
                failed += 1
                continue
            if args.dry_run:
                print(f"  would move photo #{photo.id}: {path.name}")
                moved += 1
                continue
            try:
                new_key = storage.save(path.read_bytes(), path.suffix.lower() or ".jpg")
            except StorageError as exc:
                print(f"  FAILED   photo #{photo.id}: {exc}")
                failed += 1
                continue
            photo.file_path = new_key
            db.commit()  # one photo at a time, so an interruption loses nothing
            if args.delete_local:
                path.unlink(missing_ok=True)
            print(f"  moved    photo #{photo.id}: {path.name} -> {new_key}")
            moved += 1

    verb = "would be moved" if args.dry_run else "moved"
    print(f"Done: {moved} {verb}, {skipped} already on Cloudinary, {failed} problems.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
