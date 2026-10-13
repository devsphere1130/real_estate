from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db
from app.models import Lead, Listing
from app.schemas.lead import LeadCreated, LeadIn
from app.services.ratelimit import limit_lead_submissions

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.post(
    "",
    response_model=LeadCreated,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_lead_submissions)],
)
def create_lead(data: LeadIn, db: Session = Depends(get_db)):
    if data.listing_id is not None:
        listing = db.get(Listing, data.listing_id)
        if listing is None or listing.status == "hidden":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "That listing does not exist")

    lead = Lead(
        **data.model_dump(),
        source="listing_page" if data.listing_id else "website_form",
        status="new",
    )
    db.add(lead)
    db.commit()
    return LeadCreated(id=lead.id, detail="Thank you! We have received your enquiry and will call you soon.")
