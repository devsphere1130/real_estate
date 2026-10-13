"""Write sitemap.xml for the website from the listings in the database.

Run it before building the frontend, and again whenever you add or remove properties:
    python -m scripts.generate_sitemap                      # writes ../frontend/public/sitemap.xml
    python -m scripts.generate_sitemap --out some/path.xml
The website address comes from SITE_URL in backend/.env.
"""
import argparse
import sys
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

from sqlalchemy import select

from app.config import get_settings
from app.database import SessionLocal
from app.models import Listing

DEFAULT_OUT = Path(__file__).resolve().parents[2] / "frontend" / "public" / "sitemap.xml"


def build(base: str, listings: list[tuple[str, datetime]]) -> str:
    urls = [(f"{base}/", None, "1.0"), (f"{base}/properties", None, "0.9"), (f"{base}/contact", None, "0.5")]
    urls += [(f"{base}/properties/{ref}", updated, "0.8") for ref, updated in listings]
    rows = []
    for loc, updated, priority in urls:
        lastmod = f"<lastmod>{updated:%Y-%m-%d}</lastmod>" if updated else ""
        rows.append(f"  <url><loc>{escape(loc)}</loc>{lastmod}<priority>{priority}</priority></url>")
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate sitemap.xml")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    base = get_settings().site_url.rstrip("/")
    with SessionLocal() as db:
        rows = db.execute(
            select(Listing.ref_code, Listing.updated_at).where(Listing.status == "available").order_by(Listing.id)
        ).all()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(build(base, [(r[0], r[1]) for r in rows]), encoding="utf-8")
    print(f"Wrote {args.out} with {len(rows)} property pages for {base}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
