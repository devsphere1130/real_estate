"""Check that the Cloudinary settings in .env work: uploads a tiny test image, reads it back, then deletes it.

Usage (from /backend):
    python -m scripts.check_cloudinary
"""
import io
import sys
import urllib.request

from PIL import Image

from app.config import get_settings
from app.services.storage import CloudinaryStorage, StorageError, get_storage


def main() -> int:
    settings = get_settings()
    if settings.cloudinary_credentials is None:
        print("Cloudinary is not configured. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and")
        print("CLOUDINARY_API_SECRET) in backend/.env and run this again.")
        return 1
    if settings.storage_backend.strip().lower() == "local":
        print("STORAGE_BACKEND is 'local', so the website will NOT use Cloudinary. Set it to 'auto' or 'cloudinary'.")
        return 1

    storage = get_storage()
    if not isinstance(storage, CloudinaryStorage):
        print("The app is not using Cloudinary storage. Check STORAGE_BACKEND.")
        return 1

    buf = io.BytesIO()
    Image.new("RGB", (8, 8), (11, 93, 99)).save(buf, "PNG")
    try:
        key = storage.save(buf.getvalue(), ".png")
    except StorageError as exc:
        print(f"Upload FAILED: {exc} (check the cloud name, API key and API secret; see the log above)")
        return 1
    print(f"Uploaded test image: {key}")

    url = storage.url(key)
    try:
        with urllib.request.urlopen(url, timeout=20) as response:
            ok = response.status == 200
    except Exception as exc:
        ok = False
        print(f"Could not download {url}: {exc}")
    print(f"Public URL {'works' if ok else 'did NOT work'}: {url}")

    storage.delete(key)
    print("Deleted the test image from Cloudinary.")
    print("Cloudinary is ready." if ok else "Upload worked but the public URL did not; check your Cloudinary account settings.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
