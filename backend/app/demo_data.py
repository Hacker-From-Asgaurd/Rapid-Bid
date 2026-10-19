import sys
from datetime import datetime, timedelta
from app.database import engine, Base, SessionLocal
from app.models import (
    User, Customer, RFQ, Quote, QuoteLine, QuoteRevision, RatesVersion, PartsLibrary, CompanySettings, Approval, AuditLog
)
from app.seed import seed_database, load_seed_json
from app.costing_engine import calculate_damper_cost
from app.api.quotes import get_verified_size_accuracy, get_current_size_limits

DEMO_CUSTOMERS = [
    {
        "name": "Tata Steel Limited",
        "company": "Tata Steel Kalinganagar Plant",
        "email": "procurement@tatasteel.com",
        "phone": "+91 6726 261 000",
        "city": "Jajpur",
        "state": "Odisha"
    },
    {
        "name": "JSW Steel Ltd",
        "company": "JSW Steel Vijayanagar Works",
        "email": "purchase.vjn@jsw.in",
        "phone": "+91 8395 250 120",
        "city": "Toranagallu",
        "state": "Karnataka"
    },
    {
        "name": "Reliance Industries Limited",
        "company": "RIL Jamnagar Refining Complex",
        "email": "materials.jmn@ril.com",
        "phone": "+91 288 661 2000",
        "city": "Jamnagar",
        "state": "Gujarat"
    },
    {
        "name": "NTPC Limited",
        "company": "NTPC Ramagundam Super Thermal Power Station",
        "email": "contracts.ramagundam@ntpc.co.in",
        "phone": "+91 8728 272 133",
        "city": "Peddapalli",
        "state": "Telangana"
    }
]

# 10 Sample Quotes covering:
# - one estimated size
# - one pending approval
# - one with a stale-rate warning
# - one won and one lost
DEMO_QUOTES = [
    # 1. Base 3000x3000x450 (Won, Tata Steel)
    {
        "cust_idx": 0,
        "project": "Blast Furnace Gas Isolation Line #2",
        "w": 3000, "h": 3000, "d": 450, "qty": 1, "markup": 10.0,
        "status": "Won", "days_ago": 15, "turnaround_mins": 25,
        "notes": "Fast commercial turnaround won against competitor."
    },
    # 2. Base 2000x2000x400 (Sent, JSW Steel)
    {
        "cust_idx": 1,
        "project": "Sinter Plant Duct Damper Revamp",
        "w": 2000, "h": 2000, "d": 400, "qty": 2, "markup": 12.0,
        "status": "Sent", "days_ago": 10, "turnaround_mins": 35,
        "notes": "Awaiting technical review from JSW consultants."
    },
    # 3. Large 4500x3500x500 (Pending approval, NTPC - High Value / Margin check)
    {
        "cust_idx": 3,
        "project": "ESP Flue Gas Bypass Isolation Damper Unit #4",
        "w": 4500, "h": 3500, "d": 500, "qty": 2, "markup": 11.0,
        "status": "Pending approval", "days_ago": 2, "turnaround_mins": None,
        "notes": "Large high-value damper quotation submitted for manager signoff."
    },
    # 4. Giant 6000x6000x800 (Draft, Reliance)
    {
        "cust_idx": 2,
        "project": "Thermal Power FGD Absorber Outlet Isolation",
        "w": 6000, "h": 6000, "d": 800, "qty": 1, "markup": 10.0,
        "status": "Draft", "days_ago": 1, "turnaround_mins": None,
        "notes": "Initial draft estimation for giant damper."
    },
    # 5. Non-standard 3500x3000x500 (Estimated size, Tata Steel)
    {
        "cust_idx": 0,
        "project": "Coke Oven Gas Header Interconnect",
        "w": 3500, "h": 3000, "d": 500, "qty": 1, "markup": 14.0,
        "status": "Sent", "days_ago": 4, "turnaround_mins": 20,
        "notes": "Custom size quoted with engineering verification flag."
    },
    # 6. Base 3000x3000x450 (Draft with Stale-Rate Warning, JSW Steel - rates from 45 days ago)
    {
        "cust_idx": 1,
        "project": "Pellet Plant Vent Gas Damper",
        "w": 3000, "h": 3000, "d": 450, "qty": 1, "markup": 10.0,
        "status": "Draft", "days_ago": 45, "turnaround_mins": None,
        "notes": "Quoted on previous steel rate cycle; triggers stale rate warning on send."
    },
    # 7. Medium 2500x2500x450 (Won, Reliance)
    {
        "cust_idx": 2,
        "project": "FCCU Flue Gas Cooler Bypass",
        "w": 2500, "h": 2500, "d": 450, "qty": 3, "markup": 15.0,
        "status": "Won", "days_ago": 8, "turnaround_mins": 18,
        "notes": "Won with expedited delivery commitment."
    },
    # 8. Scaled 3200x2800x450 (Lost, NTPC)
    {
        "cust_idx": 3,
        "project": "Boiler ID Fan Discharge Control Damper",
        "w": 3200, "h": 2800, "d": 450, "qty": 1, "markup": 8.0,
        "status": "Lost", "days_ago": 12, "turnaround_mins": 45,
        "notes": "Client opted for local competitor on price."
    },
    # 9. Compact 1800x1800x400 (Approved, Tata Steel)
    {
        "cust_idx": 0,
        "project": "Secondary Dedusting System Isolation",
        "w": 1800, "h": 1800, "d": 400, "qty": 2, "markup": 12.5,
        "status": "Approved", "days_ago": 3, "turnaround_mins": 28,
        "notes": "Approved by Manager with special technical guarantee."
    },
    # 10. Heavy 4000x4000x600 (Sent, Reliance - Follow-up candidate)
    {
        "cust_idx": 2,
        "project": "Off-Gas Flare Isolation Damper Revamp",
        "w": 4000, "h": 4000, "d": 600, "qty": 1, "markup": 13.0,
        "status": "Sent", "days_ago": 9, "turnaround_mins": 30,
        "notes": "Sent 9 days ago; pending client feedback (follow-up list)."
    }
]


def load_demo_data(db):
    """Loads 4 customers and 10 realistic demo quotes into the database."""
    print("Loading 4 demo customers and 10 sample quotes for Rapid Bid demo...")
    
    # Ensure seed database runs first
    seed_database(db)

    # 1. Users
    eng_user = db.query(User).filter(User.role == "Estimation Engineer").first() or db.query(User).first()
    mgr_user = db.query(User).filter(User.role == "Manager").first() or eng_user

    # 2. Get active rates and parts
    rv = db.query(RatesVersion).order_by(RatesVersion.version_number.desc()).first()
    parts = [
        {
            "id": p.id, "sr_no": p.sr_no, "name": p.name, "is_round": p.is_round,
            "dim_l_or_dia": p.dim_l_or_dia, "dim_w_or_leng": p.dim_w_or_leng,
            "dim_t": p.dim_t, "base_qty": p.base_qty, "default_moc": p.default_moc,
            "dim1_scale_code": p.dim1_scale_code, "dim2_scale_code": p.dim2_scale_code,
            "qty_scale_code": p.qty_scale_code, "per_piece_machining": p.per_piece_machining,
            "rolling_cost": p.rolling_cost
        }
        for p in db.query(PartsLibrary).order_by(PartsLibrary.sr_no.asc()).all()
    ]
    rates_dict = {
        "version_number": rv.version_number,
        "material_rates": dict(rv.material_rates),
        "labour_rates": dict(rv.labour_rates),
        "bought_out_prices": dict(rv.bought_out_prices),
        "automation_prices": dict(rv.automation_prices),
        "fabrication_rate_per_kg": rv.fabrication_rate_per_kg,
        "finishing_rate_per_kg": rv.finishing_rate_per_kg,
        "default_markup_pct": rv.default_markup_pct
    }
    size_limits = get_current_size_limits(db)

    # 3. Create or reuse the 4 customers
    created_custs = []
    for c_info in DEMO_CUSTOMERS:
        existing = db.query(Customer).filter(Customer.company == c_info["company"]).first()
        if not existing:
            existing = Customer(**c_info)
            db.add(existing)
            db.commit()
            db.refresh(existing)
        created_custs.append(existing)

    # 4. Clear old demo quotes if needed or avoid duplicate quote numbers
    year = datetime.utcnow().year
    
    # We will generate quotes RB-2026-1001 to RB-2026-1010
    for idx, q_spec in enumerate(DEMO_QUOTES):
        q_num = f"RB-{year}-{1001 + idx:04d}"
        existing_q = db.query(Quote).filter(Quote.quote_number == q_num).first()
        if existing_q:
            # Delete old demo quote lines and quote
            db.query(QuoteLine).filter(QuoteLine.quote_id == existing_q.id).delete()
            db.query(QuoteRevision).filter(QuoteRevision.quote_id == existing_q.id).delete()
            db.query(Approval).filter(Approval.quote_id == existing_q.id).delete()
            db.delete(existing_q)
            db.commit()

        cust = created_custs[q_spec["cust_idx"]]
        
        # Calculate damper cost using standard engine
        calc = calculate_damper_cost(
            width_mm=q_spec["w"],
            height_mm=q_spec["h"],
            depth_mm=q_spec["d"],
            parts_data=parts,
            rates_data=rates_dict,
            damper_quantity=q_spec["qty"],
            markup_pct_override=q_spec["markup"],
            size_limits=size_limits
        )

        acc = get_verified_size_accuracy(db, q_spec["w"], q_spec["h"], q_spec["d"], calc["total_cost"])

        # Determine timestamps for turnaround tracking
        days_ago = q_spec["days_ago"]
        now = datetime.utcnow()
        rfq_received = now - timedelta(days=days_ago, minutes=45)
        created = now - timedelta(days=days_ago, minutes=30)
        
        status = q_spec["status"]
        approved_at = None
        sent_at = None
        turnaround = q_spec.get("turnaround_mins")
        if turnaround and status in ("Approved", "Sent", "Won", "Lost"):
            approved_at = created + timedelta(minutes=turnaround - 5)
            sent_at = created + timedelta(minutes=turnaround)
        elif status == "Approved":
            approved_at = created + timedelta(minutes=15)

        # Delete pre-existing demo RFQ if any
        rfq_num = f"RFQ-{year}-{1001 + idx:04d}"
        existing_rfq = db.query(RFQ).filter(RFQ.rfq_number == rfq_num).first()
        if existing_rfq:
            db.delete(existing_rfq)
            db.commit()

        rfq = RFQ(
            rfq_number=rfq_num,
            customer_id=cust.id,
            project_name=q_spec["project"],
            quantity=q_spec["qty"],
            notes=q_spec["notes"],
            width_mm=q_spec["w"],
            height_mm=q_spec["h"],
            depth_mm=q_spec["d"],
            default_moc="IS 2062",
            actuation_type="Electric Actuator",
            status="Closed" if status in ("Won", "Lost") else "Open",
            created_by_id=eng_user.id,
            created_at=rfq_received
        )
        db.add(rfq)
        db.commit()
        db.refresh(rfq)

        quote = Quote(
            quote_number=q_num,
            rfq_id=rfq.id,
            customer_id=cust.id,
            damper_type="rack_and_pinion",
            width_mm=q_spec["w"],
            height_mm=q_spec["h"],
            depth_mm=q_spec["d"],
            total_weight_kg=calc["total_weight_kg"],
            raw_material_cost=calc["raw_material_cost"],
            mfg_cost=calc["mfg_cost"],
            basic_cost=calc["basic_cost"],
            automation_cost=calc["automation_cost"],
            fabrication_cost=calc["fabrication_cost"],
            total_cost=calc["total_cost"],
            markup_pct=calc["markup_pct"],
            margin_pct=calc["margin_pct"],
            quoted_price=calc["quoted_price"],
            status=status,
            rate_version_id=rv.id,
            revision_number=1,
            is_scaled=calc.get("is_scaled", False),
            flap_material="IS 2062",
            actuation_type="Electric Actuator",
            verified_size_id=acc["verified_size_id"],
            accuracy_label=acc["accuracy_label"],
            rfq_received_at=rfq_received,
            approved_at=approved_at,
            sent_at=sent_at,
            approval_comment="Approved with standard commercial warranty" if status == "Approved" else None,
            created_by_id=eng_user.id,
            created_at=created,
            updated_at=sent_at or created
        )
        db.add(quote)
        db.commit()
        db.refresh(quote)

        # Lines
        for line in calc["lines"]:
            ql = QuoteLine(
                quote_id=quote.id,
                part_id=line.get("part_id"),
                sr_no=line["sr_no"],
                part_name=line["part_name"],
                is_round=line.get("is_round", False),
                dim_1=line["dim_1"],
                dim_2=line["dim_2"],
                dim_3=line.get("dim_3", 0.0),
                qty=line["qty"],
                weight=line["weight"],
                moc=line["moc"],
                material_rate=line["material_rate"],
                rm_cost=line["rm_cost"],
                plate_labour_rate=line.get("plate_labour_rate", 0.0),
                plate_labour_cost=line.get("plate_labour_cost", 0.0),
                per_piece_machining=line.get("per_piece_machining", 0.0),
                rolling_cost=line.get("rolling_cost", 0.0),
                mfg_cost_total=line.get("mfg_cost_total", line.get("mfg_cost", 0.0)),
                line_total=line.get("line_total", line.get("total_cost", 0.0)),
                is_scaled=line.get("is_scaled", False)
            )
            db.add(ql)
        
        # Revision
        rev = QuoteRevision(
            quote_id=quote.id,
            revision_number=1,
            snapshot_data={
                "revision_number": 1,
                "damper_type": "rack_and_pinion",
                "width_mm": q_spec["w"],
                "height_mm": q_spec["h"],
                "depth_mm": q_spec["d"],
                "quantity": q_spec["qty"],
                "markup_pct": q_spec["markup"],
                "customer": {"name": cust.name, "company": cust.company},
                "rates_snapshot": rates_dict,
                "totals": calc,
                "lines": calc["lines"],
                "accuracy": acc,
                "saved_by": eng_user.full_name
            },
            total_cost=quote.total_cost,
            quoted_price=quote.quoted_price,
            created_by_id=eng_user.id,
            created_at=created
        )
        db.add(rev)

        if status == "Approved":
            appr = Approval(
                quote_id=quote.id,
                approver_id=mgr_user.id,
                action="Approved",
                comment="Manager approval granted for project schedule.",
                created_at=approved_at or created
            )
            db.add(appr)

        db.commit()

    print("Demo dataset successfully loaded: 4 Customers, 10 Rapid Bid Quotes.")


if __name__ == "__main__":
    db = SessionLocal()
    load_demo_data(db)
    db.close()
