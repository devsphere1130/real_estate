"""Insert 8 sample listings (5 for sale, 3 for rent) so the site has something to show.

Usage (from /backend):
    python -m scripts.seed            # refuses to run if listings already exist
    python -m scripts.seed --reset    # deletes ALL listings (and their photos) first
"""
import argparse
import sys

from sqlalchemy import delete, func, select

from app.database import SessionLocal
from app.models import Listing
from app.schemas.listing import ListingIn
from app.services.listings import new_listing
from app.services.storage import get_storage

CITY = "Jaipur"

SAMPLES = [
    dict(
        title="2 BHK flat near Green Park Road",
        kind="sale", property_type="flat", locality="Green Park Road",
        price=6_800_000, carpet_area_sqft=780, bedrooms=2, floor=3, total_floors=7,
        age_years=4, facing="East", furnishing="semi-furnished", is_featured=True,
        description="Bright 2 BHK on the third floor with a balcony and covered parking. "
                    "Five minutes from the market, school and bus stop.",
        amenities=["Lift", "Covered parking", "24x7 water", "Power backup", "CCTV"],
    ),
    dict(
        title="3 BHK flat with club access",
        kind="sale", property_type="flat", locality="Vaishali Nagar",
        price=13_500_000, carpet_area_sqft=1280, bedrooms=3, floor=9, total_floors=14,
        age_years=2, facing="North-East", furnishing="unfurnished", is_featured=True,
        description="Spacious 3 BHK in a gated society with a clubhouse, gym and children's play area.",
        amenities=["Lift", "Gym", "Clubhouse", "Swimming pool", "Security", "Power backup"],
    ),
    dict(
        title="Independent villa with garden",
        kind="sale", property_type="villa", locality="Mansarovar",
        price=24_000_000, carpet_area_sqft=2400, bedrooms=4, floor=0, total_floors=2,
        age_years=6, facing="North", furnishing="semi-furnished", is_featured=True,
        description="Two-floor independent villa on a 200 sq yd plot with a lawn, car porch and servant room.",
        amenities=["Garden", "Car porch", "Servant room", "Modular kitchen", "Borewell"],
    ),
    dict(
        title="Residential plot, corner, east facing",
        kind="sale", property_type="plot", locality="Jagatpura",
        price=4_500_000, carpet_area_sqft=1800,
        facing="East",
        description="Corner residential plot in an approved colony with 40 ft road, ready for construction.",
        amenities=["Corner plot", "40 ft road", "Approved layout", "Electricity connection"],
    ),
    dict(
        title="Ground floor shop on main road",
        kind="sale", property_type="shop", locality="C-Scheme",
        price=8_500_000, carpet_area_sqft=420, floor=0, total_floors=3, age_years=8,
        description="Ground floor shop with wide frontage on a busy road, suitable for retail or a clinic.",
        amenities=["Main road facing", "Shutter", "Parking nearby"],
    ),
    dict(
        title="2 BHK furnished flat for rent",
        kind="rent", property_type="flat", locality="Malviya Nagar",
        price=14_000, carpet_area_sqft=850, bedrooms=2, floor=2, total_floors=4,
        age_years=5, facing="West", furnishing="furnished",
        description="Fully furnished 2 BHK with wardrobes, geyser and modular kitchen. Family or working professionals.",
        amenities=["Fully furnished", "Parking", "Water supply", "Security"],
    ),
    dict(
        title="First floor shop for rent",
        kind="rent", property_type="shop", locality="Tonk Road",
        price=32_000, carpet_area_sqft=600, floor=1, total_floors=3, age_years=10,
        description="Open hall on the first floor with its own washroom, ideal for an office or showroom.",
        amenities=["Washroom", "Power backup", "Lift"],
    ),
    dict(
        title="Single room near university",
        kind="rent", property_type="room", locality="Raja Park",
        price=6_000, carpet_area_sqft=150, floor=1, total_floors=2, age_years=12,
        furnishing="semi-furnished",
        description="Clean single room with an attached bathroom, suitable for a student or working professional.",
        amenities=["Attached bathroom", "Wi-Fi ready", "Water supply"],
    ),
]


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed sample listings")
    parser.add_argument("--reset", action="store_true", help="delete all existing listings first")
    args = parser.parse_args()

    with SessionLocal() as db:
        existing = db.scalar(select(func.count()).select_from(Listing)) or 0
        if existing and not args.reset:
            print(f"{existing} listing(s) already exist. Use --reset to replace them.")
            return 1
        if args.reset:
            storage = get_storage()
            for listing in db.scalars(select(Listing)).all():
                for photo in listing.photos:
                    storage.delete(photo.file_path)
            db.execute(delete(Listing))
            db.commit()

        for sample in SAMPLES:
            new_listing(db, ListingIn(city=CITY, **sample))
        db.commit()
        refs = db.scalars(select(Listing.ref_code).order_by(Listing.id)).all()
    print(f"Inserted {len(SAMPLES)} listings: {', '.join(refs)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
