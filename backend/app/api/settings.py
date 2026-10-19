from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import CompanySettings, User
from app.api.auth import get_current_user, require_roles

router = APIRouter(prefix="/company-settings", tags=["Company Settings"])

class CompanySettingsSchema(BaseModel):
    company_name: str
    address: str
    gstin: str
    email: str
    phone: str
    logo_url: Optional[str] = ""
    quote_validity_days: int = 30
    payment_terms: str
    delivery_terms: str
    warranty_terms: str
    approval_threshold_value: Optional[float] = 2500000.0
    approval_min_margin_pct: Optional[float] = 12.0
    approval_max_discount_pct: Optional[float] = 10.0
    stale_rate_days_limit: Optional[int] = 30
    manual_baseline_hours_per_quote: Optional[float] = 4.0

def get_or_create_settings(db: Session) -> CompanySettings:
    cs = db.query(CompanySettings).first()
    if not cs:
        cs = CompanySettings()
        db.add(cs)
        db.commit()
        db.refresh(cs)
    return cs

@router.get("", response_model=CompanySettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)

@router.put("", dependencies=[Depends(require_roles(["Admin", "Manager"]))], response_model=CompanySettingsSchema)
def update_settings(
    payload: CompanySettingsSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cs = get_or_create_settings(db)
    cs.company_name = payload.company_name
    cs.address = payload.address
    cs.gstin = payload.gstin
    cs.email = payload.email
    cs.phone = payload.phone
    cs.logo_url = payload.logo_url or ""
    cs.quote_validity_days = payload.quote_validity_days
    cs.payment_terms = payload.payment_terms
    cs.delivery_terms = payload.delivery_terms
    cs.warranty_terms = payload.warranty_terms
    if payload.approval_threshold_value is not None:
        cs.approval_threshold_value = payload.approval_threshold_value
    if payload.approval_min_margin_pct is not None:
        cs.approval_min_margin_pct = payload.approval_min_margin_pct
    if payload.approval_max_discount_pct is not None:
        cs.approval_max_discount_pct = payload.approval_max_discount_pct
    if payload.stale_rate_days_limit is not None:
        cs.stale_rate_days_limit = payload.stale_rate_days_limit
    if payload.manual_baseline_hours_per_quote is not None:
        cs.manual_baseline_hours_per_quote = payload.manual_baseline_hours_per_quote
    db.commit()
    db.refresh(cs)
    return cs

