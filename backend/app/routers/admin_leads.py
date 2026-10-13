from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.deps import get_current_admin, get_db
from app.models import Lead
from app.schemas.common import Page, make_page
from app.schemas.lead import LeadOut, LeadPatch, LeadStatus
from app.services.listings import escape_like

router = APIRouter(
    prefix="/api/admin/leads",
    tags=["admin-leads"],
    dependencies=[Depends(get_current_admin)],
)


def to_out(lead: Lead) -> LeadOut:
    return LeadOut(
        id=lead.id,
        name=lead.name,
        phone=lead.phone,
        email=lead.email,
        interest=lead.interest,
        property_type=lead.property_type,
        budget_text=lead.budget_text,
        message=lead.message,
        listing_id=lead.listing_id,
        listing_ref=lead.listing.ref_code if lead.listing else None,
        listing_title=lead.listing.title if lead.listing else None,
        source=lead.source,
        status=lead.status,
        owner_notes=lead.owner_notes,
        created_at=lead.created_at,
    )


def _get_or_404(db: Session, lead_id: int) -> Lead:
    lead = db.scalar(select(Lead).where(Lead.id == lead_id).options(joinedload(Lead.listing)))
    if lead is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lead not found")
    return lead


@router.get("", response_model=Page[LeadOut])
def list_leads(
    status_: LeadStatus | None = Query(None, alias="status"),
    q: str | None = Query(None, max_length=100, description="Search by name or phone"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(Lead)
    if status_:
        stmt = stmt.where(Lead.status == status_)
    if q and q.strip():
        pattern = f"%{escape_like(q.strip())}%"
        stmt = stmt.where(or_(Lead.name.ilike(pattern, escape="\\"), Lead.phone.like(pattern, escape="\\")))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.options(joinedload(Lead.listing))
        .order_by(Lead.created_at.desc(), Lead.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return make_page([to_out(r) for r in rows], total, page, page_size)


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: int, patch: LeadPatch, db: Session = Depends(get_db)):
    lead = _get_or_404(db, lead_id)
    for name, value in patch.model_dump(exclude_unset=True).items():
        setattr(lead, name, value)
    db.commit()
    return to_out(_get_or_404(db, lead_id))


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    db.delete(_get_or_404(db, lead_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
