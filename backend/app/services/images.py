import io

from PIL import Image, UnidentifiedImageError

# Refuse absurdly large pixel counts (decompression bombs) before decoding.
Image.MAX_IMAGE_PIXELS = 60_000_000

_FORMAT_TO_EXT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


class InvalidImage(ValueError):
    pass


def detect_extension(data: bytes) -> str:
    """Return the extension for the REAL file type, ignoring the client's filename and Content-Type."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = img.format
            img.verify()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError) as exc:
        raise InvalidImage("File is not a valid image") from exc
    if fmt not in _FORMAT_TO_EXT:
        raise InvalidImage("Only jpg, png and webp images are allowed")
    return _FORMAT_TO_EXT[fmt]
