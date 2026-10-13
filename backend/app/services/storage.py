"""File storage for listing photos.

This is the ONLY module that knows where files live. To move to cloud storage (S3, Cloudinary, ...),
write another class with the same three methods (save / delete / url) and return it from get_storage().
"""
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

from app.config import get_settings


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


@lru_cache
def get_storage() -> LocalStorage:
    return LocalStorage(Path(get_settings().upload_dir))
