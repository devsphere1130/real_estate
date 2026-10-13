import math
import re
from typing import Annotated, Generic, TypeVar

from pydantic import AfterValidator, BaseModel, BeforeValidator, StringConstraints

T = TypeVar("T")

_TAGS = re.compile(r"<[^>]*>")
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(value: str) -> str:
    """Strip HTML tags and control characters. The React frontend also escapes on render."""
    return _CONTROL.sub("", _TAGS.sub("", value)).strip()


def _required(value: str) -> str:
    cleaned = clean_text(value)
    if not cleaned:
        raise ValueError("must not be empty")
    return cleaned


def _blank_to_none(value):
    return None if isinstance(value, str) and not value.strip() else value


def req_text(max_length: int, min_length: int = 1):
    return Annotated[
        str,
        StringConstraints(min_length=min_length, max_length=max_length),
        AfterValidator(_required),
    ]


def opt_text(max_length: int):
    inner = Annotated[str, StringConstraints(max_length=max_length), AfterValidator(clean_text)]
    return Annotated[inner | None, BeforeValidator(_blank_to_none)]


def blank_to_none(type_):
    """Wrap an optional type so that an empty string from a form becomes None."""
    return Annotated[type_ | None, BeforeValidator(_blank_to_none)]


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


def make_page(items: list, total: int, page: int, page_size: int) -> dict:
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, math.ceil(total / page_size)),
    }
