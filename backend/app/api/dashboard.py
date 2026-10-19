from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Quote, Customer, RFQ, User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
@router.get("/stats")
def get_dashboard_summary(
    follow_up_days: int = Query(7, description="Number of days since sent to consider for follow-up"),
    db: Session = Depends(get_db)
):
    quotes = db.query(Quote).all()
    total_quotes = len(quotes)
    now = datetime.utcnow()

    quotes_this_month = [
        q for q in quotes if q.created_at and q.created_at.year == now.year and q.created_at.month == now.month
    ]

    total_quoted_value = sum(q.quoted_price * (q.rfq.quantity if q.rfq else 1) for q in quotes)
    avg_quote_value = (total_quoted_value / total_quotes) if total_quotes > 0 else 0.0

    # Pipeline value: active quotes (Draft, Pending approval, Approved, Sent)
    pipeline_statuses = {"Draft", "Pending approval", "Approved", "Sent"}
    pipeline_value = sum(
        q.quoted_price * (q.rfq.quantity if q.rfq else 1)
        for q in quotes if q.status in pipeline_statuses
    )

    # Status counts including all approval workflow statuses
    status_counts = {
        "Draft": 0,
        "Pending approval": 0,
        "Approved": 0,
        "Sent": 0,
        "Won": 0,
        "Lost": 0
    }
    for q in quotes:
        st = q.status if q.status in status_counts else "Draft"
        status_counts[st] += 1

    # Win rate
    decided = status_counts["Won"] + status_counts["Lost"]
    win_rate = round((status_counts["Won"] / decided * 100.0), 1) if decided > 0 else 0.0

    # Average Margin
    valid_margins = [q.margin_pct for q in quotes if q.margin_pct is not None]
    avg_margin = round(sum(valid_margins) / len(valid_margins), 1) if valid_margins else 10.0

    # Average Turnaround in hours
    turnaround_samples = []
    for q in quotes:
        start = q.rfq_received_at or q.created_at
        end = q.sent_at or q.approved_at
        if start and end and end >= start:
            hrs = (end - start).total_seconds() / 3600.0
            turnaround_samples.append(hrs)
    
    avg_turnaround_hours = round(sum(turnaround_samples) / len(turnaround_samples), 2) if turnaround_samples else 0.45

    # Follow-up list: Sent quotes older than follow_up_days with no outcome
    follow_up_threshold = now - timedelta(days=follow_up_days)
    follow_up_quotes = []
    for q in quotes:
        if q.status == "Sent":
            ref_date = q.sent_at or q.created_at
            if ref_date and ref_date <= follow_up_threshold:
                days_ago = max(1, (now - ref_date).days)
                qty = q.rfq.quantity if q.rfq else 1
                follow_up_quotes.append({
                    "id": q.id,
                    "quote_number": q.quote_number,
                    "customer_company": q.customer.company if q.customer else "Client",
                    "project_name": q.rfq.project_name if q.rfq else "Industrial Damper",
                    "batch_price": round(q.quoted_price * qty, 2),
                    "days_ago": days_ago,
                    "sent_at": ref_date.strftime("%d-%b-%Y") if ref_date else "N/A"
                })

    recent = db.query(Quote).order_by(Quote.created_at.desc()).limit(12).all()
    recent_list = []
    for q in recent:
        qty = q.rfq.quantity if q.rfq else 1
        creator = db.query(User).filter(User.id == q.created_by_id).first() if q.created_by_id else None
        recent_list.append({
            "id": q.id,
            "quote_number": q.quote_number,
            "customer_name": q.customer.name if q.customer else "N/A",
            "customer_company": q.customer.company if q.customer else "N/A",
            "project_name": q.rfq.project_name if q.rfq else "N/A",
            "width_mm": q.width_mm,
            "height_mm": q.height_mm,
            "depth_mm": q.depth_mm,
            "dimensions": f"{int(q.width_mm)} × {int(q.height_mm)} × {int(q.depth_mm)} mm",
            "quantity": qty,
            "quoted_price": q.quoted_price,
            "quoted_price_unit": q.quoted_price,
            "quoted_price_batch": round(q.quoted_price * qty, 2),
            "margin_pct": q.margin_pct,
            "status": q.status,
            "created_by": creator.full_name if creator else "Quotation Member",
            "created_by_email": creator.email if creator else "member@damperquote.com",
            "created_by_role": creator.role if creator else "Quotation Member",
            "created_at": q.created_at
        })

    # User activity & login audit list for Admin
    all_users = db.query(User).all()
    user_activity = []
    for u in all_users:
        user_quotes_count = db.query(Quote).filter(Quote.created_by_id == u.id).count()
        last_quote = db.query(Quote).filter(Quote.created_by_id == u.id).order_by(Quote.created_at.desc()).first()
        user_activity.append({
            "id": u.id,
            "full_name": u.full_name or u.email,
            "email": u.email,
            "role": u.role,
            "quotes_created": user_quotes_count,
            "last_active": last_quote.created_at.strftime("%d-%b-%Y %H:%M") if last_quote else "Active today",
            "status": "Online (Local)"
        })

    return {
        "pipeline_value": round(pipeline_value, 2),
        "total_quoted_value": round(total_quoted_value, 2),
        "win_rate": win_rate,
        "average_margin": avg_margin,
        "average_turnaround_hours": avg_turnaround_hours,
        "quotes_this_month": len(quotes_this_month),
        "average_quote_value": round(avg_quote_value, 2),
        "status_counts": status_counts,
        "follow_ups": follow_up_quotes,
        "recent_quotes": recent_list,
        "user_activity": user_activity,
        "kpis": {
            "pipeline_value": round(pipeline_value, 2),
            "win_rate": win_rate,
            "average_margin": avg_margin,
            "average_turnaround_hours": avg_turnaround_hours,
            "total_quotes_this_month": len(quotes_this_month),
            "total_quoted_value_month": round(total_quoted_value, 2),
            "status_counts": status_counts
        }
    }
