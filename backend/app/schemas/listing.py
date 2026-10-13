from datetime import datetime
from typing import Annotated, Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    computed_field,
    create_model,
    model_validator,
)

from app.schemas.common import blank_to_none, clean_text, opt_text, req_text
from app.services.storage import get_storage

Kind = Literal["sale", "rent"]
PropertyType = Literal["flat", "villa", "plot", "shop", "room"]
Status = Literal["available", "sold", "rented", "hidden"]
Facing = Literal[
    "North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West"
]
Furnishing = Literal["unfurnished", "semi-furnished", "furnished"]

Amenity = Annotated[str, StringConstraints(min_length=1, max_length=50)]


class ListingIn(BaseModel):
    """Full listing payload used by POST and PUT (admin)."""

    model_config = ConfigDict(extra="forbid")

    title: req_text(200, min_length=3)
    kind: Kind
    property_type: PropertyType
    locality: req_text(150)
    city: req_text(100)
    price: int = Field(gt=0, le=10_000_000_000, description="Rupees. For rent: per month.")
    carpet_area_sqft: int = Field(gt=0, le=10_000_000)
    bedrooms: blank_to_none(Annotated[int, Field(ge=0, le=20)]) = None
    floor: blank_to_none(Annotated[int, Field(ge=-2, le=200)]) = None
    total_floors: blank_to_none(Annotated[int, Field(ge=0, le=200)]) = None
    age_years: blank_to_none(Annotated[int, Field(ge=0, le=200)]) = None
    facing: blank_to_none(Facing) = None
    furnishing: blank_to_none(Furnishing) = None
    status: Status = "available"
    description: opt_text(5000) = None
    amenities: list[Amenity] = Field(default_factory=list, max_length=30)
    is_featured: bool = False

    @model_validator(mode="after")
    def _cross_checks(self):
        self.amenities = [a for a in (clean_text(x) for x in self.amenities) if a]
        if self.floor is not None and self.total_floors is not None and self.floor > self.total_floors:
            raise ValueError("floor cannot be higher than total_floors")
        if self.status == "sold" and self.kind != "sale":
            raise ValueError("only a listing for sale can be marked sold")
        if self.status == "rented" and self.kind != "rent":
            raise ValueError("only a listing for rent can be marked rented")
        return self


# Partial update: every field optional. The merged result is re-validated with ListingIn.
ListingPatch = create_model(
    "ListingPatch",
    __config__=ConfigDict(extra="forbid"),
    **{name: (Optional[field.annotation], None) for name, field in ListingIn.model_fields.items()},
)


class PhotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sort_order: int
    is_cover: bool
    file_path: str = Field(exclude=True)

    @computed_field
    @property
    def url(self) -> str:
        return get_storage().url(self.file_path)


class ListingCard(BaseModel):
    """Compact shape for list pages."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    ref_code: str
    title: str
    kind: Kind
    property_type: PropertyType
    locality: str
    city: str
    price: int
    carpet_area_sqft: int
    bedrooms: int | None
    floor: int | None
    total_floors: int | None
    age_years: int | None
    facing: str | None
    furnishing: str | None
    status: Status
    is_featured: bool
    created_at: datetime
    cover_url: str | None = None


class ListingDetail(ListingCard):
    description: str | None
    amenities: list[str]
    photos: list[PhotoOut]
    updated_at: datetime


class ReorderIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    photo_ids: list[int] = Field(min_length=1)
