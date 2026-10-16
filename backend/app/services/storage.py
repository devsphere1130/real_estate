"""File storage for listing photos.

This is the ONLY module that knows where photo files live. It has two storages with the same three
methods (save / delete / url); get_storage() picks one from the settings:

* LocalStorage      - the uploads folder next to the backend (development).
* CloudinaryStorage - Cloudinary (production, e.g. on Vercel where the disk is temporary).

What is saved in listing_photos.file_path is the storage "key":
  local key       "3f2a....jpg"                          -> served by the API at /uploads/<key>
  Cloudinary key  "real-estate/properties/3f2a....jpg"   -> served by Cloudinary
A key with a "/" belongs to Cloudinary, so photos uploaded before the switch keep working.
"""
import io
import logging
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from app.config import get_settings

logger = logging.getLogger("devsphere")


class StorageError(RuntimeError):
    """The photo could not be stored. The message is safe to show to the admin."""


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, data: bytes, ext: str) -> str:
        """Store bytes and return the storage key (saved in listing_photos.file_path)."""
        key = f"{uuid4().hex}{ext}"
        (self.root / key).write_bytes(data)
        return key

    def delete(self, key: str) -> None:
        # Path(...).name blocks any attempt at path traversal.
        (self.root / Path(key).name).unlink(missing_ok=True)

    def url(self, key: str) -> str:
        """Public URL path. The frontend prefixes it with the API origin."""
        return f"/uploads/{key}"


class CloudinaryStorage:
    # Applied when a photo is delivered: pick a good quality automatically and never send more than 1600px wide.
    DELIVERY = "q_auto,w_1600,c_limit"

    def __init__(self, cloud_name: str, api_key: str, api_secret: str, folder: str, legacy: LocalStorage):
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret, secure=True)
        self._uploader = cloudinary.uploader
        self.cloud_name = cloud_name
        self.folder = folder.strip("/") or "real-estate/properties"
        self.legacy = legacy  # photos saved on disk before Cloudinary was switched on

    @staticmethod
    def _is_cloud_key(key: str) -> bool:
        return "/" in key

    def save(self, data: bytes, ext: str) -> str:
        try:
            result = self._uploader.upload(
                io.BytesIO(data),
                folder=self.folder,
                public_id=uuid4().hex,
                resource_type="image",
                overwrite=False,
            )
        except Exception as exc:  # the SDK raises its own Error plus network errors
            logger.exception("Cloudinary upload failed")
            raise StorageError("Could not upload the photo to cloud storage. Please try again.") from exc
        return f"{result['public_id']}{ext}"

    def delete(self, key: str) -> None:
        if not self._is_cloud_key(key):
            self.legacy.delete(key)
            return
        public_id = key.rsplit(".", 1)[0] if "." in key.rsplit("/", 1)[-1] else key
        try:
            self._uploader.destroy(public_id, resource_type="image", invalidate=True)
        except Exception:
            # The photo row is already gone from the database; a leftover file is only wasted space.
            logger.exception("Could not delete %s from Cloudinary", public_id)

    def url(self, key: str) -> str:
        if not self._is_cloud_key(key):
            return self.legacy.url(key)
        return f"https://res.cloudinary.com/{self.cloud_name}/image/upload/{self.DELIVERY}/{key}"


@lru_cache
def get_storage() -> LocalStorage | CloudinaryStorage:
    settings = get_settings()
    backend = settings.storage_backend.strip().lower()
    if backend not in {"auto", "local", "cloudinary"}:
        raise RuntimeError("STORAGE_BACKEND must be 'auto', 'local' or 'cloudinary'")

    local = LocalStorage(settings.resolved_upload_dir)
    credentials = settings.cloudinary_credentials
    if backend == "cloudinary" and credentials is None:
        raise RuntimeError(
            "STORAGE_BACKEND=cloudinary but the Cloudinary settings are missing. Set CLOUDINARY_URL, or "
            "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET."
        )
    if backend != "local" and credentials is not None:
        return CloudinaryStorage(*credentials, folder=settings.cloudinary_folder, legacy=local)
    return local
