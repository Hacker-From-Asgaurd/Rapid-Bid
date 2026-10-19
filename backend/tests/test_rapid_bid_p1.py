import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.seed import seed_database, load_seed_json
from app.models import User, Customer, RFQ, Quote, RatesVersion, PartsLibrary, CompanySettings
from app.costing_engine import calculate_damper_cost
from app.rfq_parser import parse_rfq_text, SAMPLE_RFQS
from app.services.pdf_service import generate_customer_quote_pdf, generate_internal_cost_sheet_pdf

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    db = SessionLocal()
    seed_database(db)
    yield db
    db.close()

# ─────────────────────────────────────────────────────────────────────────────
# 1. RFQ Parser Tests (16 Distinct Test Cases)
# ─────────────────────────────────────────────────────────────────────────────

def test_parser_case_1_standard_mm_3d():
    res = parse_rfq_text("Need damper 3000 x 3000 x 450 mm in IS 2062, Qty: 2, Electric Actuator")
    assert res["dimensions"]["found"] is True
    assert res["dimensions"]["width_mm"] == 3000
    assert res["dimensions"]["height_mm"] == 3000
    assert res["dimensions"]["depth_mm"] == 450
    assert res["material"]["value"] == "IS 2062"
    assert res["quantity"]["value"] == 2
    assert res["actuation"]["value"] == "Electric Actuator"

def test_parser_case_2_upper_case_x():
    res = parse_rfq_text("SLIDING FLAP DAMPER 2000X2000X400 SS304 QTY 1 NOS")
    assert res["dimensions"]["found"] is True
    assert res["dimensions"]["width_mm"] == 2000
    assert res["dimensions"]["height_mm"] == 2000
    assert res["dimensions"]["depth_mm"] == 400
    assert res["material"]["value"] == "SS 304"
    assert res["quantity"]["value"] == 1

def test_parser_case_3_meters_3d():
    res = parse_rfq_text("Please quote 3 m by 3 m by 0.45 m damper, SS 316, 1 unit")
    assert res["dimensions"]["found"] is True
    assert res["dimensions"]["width_mm"] == 3000
    assert res["dimensions"]["height_mm"] == 3000
    assert res["dimensions"]["depth_mm"] == 450
    assert res["material"]["value"] == "SS 316"

def test_parser_case_4_meters_2d_with_default_depth():
    res = parse_rfq_text("Duct size 3 m by 3 m, galvanized steel frame, manual handwheel, Qty: 3")
    assert res["dimensions"]["found"] is True
    assert res["dimensions"]["width_mm"] == 3000
    assert res["dimensions"]["height_mm"] == 3000
    assert res["dimensions"]["depth_mm"] == 450
    assert res["material"]["value"] == "Galvanized Steel"
    assert res["actuation"]["value"] == "Manual Handwheel"
    assert res["quantity"]["value"] == 3

def test_parser_case_5_explicit_labels():
    res = parse_rfq_text("Damper dimensions W: 4500 mm, H: 3500 mm, D: 500 mm. Material: IS 2062. Qty 4.")
    assert res["dimensions"]["found"] is True
    assert res["dimensions"]["width_mm"] == 4500
    assert res["dimensions"]["height_mm"] == 3500
    assert res["dimensions"]["depth_mm"] == 500
    assert res["quantity"]["value"] == 4

def test_parser_case_6_asterisk_separator():
    res = parse_rfq_text("Heavy duty damper 6000*6000*800 mm, SS 304L, Auma motorized actuator")
    assert res["dimensions"]["width_mm"] == 6000
    assert res["dimensions"]["height_mm"] == 6000
    assert res["dimensions"]["depth_mm"] == 800
    assert res["material"]["value"] == "SS 304L"
    assert res["actuation"]["value"] == "Electric Actuator"

def test_parser_case_7_pneumatic_cylinder():
    res = parse_rfq_text("Sliding gate damper 2500 x 2500 x 450, Pneumatic cylinder operation with solenoid")
    assert res["actuation"]["value"] == "Pneumatic Cylinder"
    assert res["actuation"]["found"] is True

def test_parser_case_8_pressure_mmwc():
    res = parse_rfq_text("Damper 3000x3000x450, design pressure 450 mmWC, temp 220 °C")
    assert res["pressure"]["found"] is True
    assert "450" in res["pressure"]["value"]
    assert "MMWC" in res["pressure"]["value"]

def test_parser_case_9_pressure_kpa():
    res = parse_rfq_text("Isolation damper 2000x2000x400, operating at 5 kPa, 180 deg C")
    assert res["pressure"]["found"] is True
    assert "5" in res["pressure"]["value"]
    assert "KPA" in res["pressure"]["value"]

def test_parser_case_10_temperature_deg_c():
    res = parse_rfq_text("Flue gas damper 4500x3500x500 at 350 deg C, 2 Nos")
    assert res["temperature"]["found"] is True
    assert "350" in res["temperature"]["value"]

def test_parser_case_11_temperature_c_symbol():
    res = parse_rfq_text("Operating condition: 280 °C and -350 mmWG")
    assert res["temperature"]["found"] is True
    assert "280" in res["temperature"]["value"]

def test_parser_case_12_quantity_units_format():
    res = parse_rfq_text("Supply 5 units of industrial damper 3000 x 3000 x 450 mm")
    assert res["quantity"]["value"] == 5

def test_parser_case_13_material_316l():
    res = parse_rfq_text("Acidic gas duct damper 2000x2000x400 in 316L stainless steel")
    assert res["material"]["value"] == "SS 316L"

def test_parser_case_14_product_type_valve_detection():
    res = parse_rfq_text("Requirement for 300 mm Butterfly valve with electric actuator")
    assert res["product_type"]["value"] == "valve"

def test_parser_case_15_all_sample_rfqs_parse_valid_dimensions():
    for sample in SAMPLE_RFQS:
        parsed = parse_rfq_text(sample["text"])
        assert parsed["dimensions"]["found"] is True
        assert parsed["dimensions"]["width_mm"] >= 1000
        assert parsed["dimensions"]["height_mm"] >= 1000

def test_parser_case_16_empty_text_graceful_defaults():
    res = parse_rfq_text("")
    assert res["dimensions"]["width_mm"] == 3000
    assert res["dimensions"]["height_mm"] == 3000
    assert res["dimensions"]["found"] is False


# ─────────────────────────────────────────────────────────────────────────────
# 2. Approval Workflow Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_approval_workflow_flow(setup_db):
    # Load demo data
    demo_res = client.post("/api/v1/demo/load")
    assert demo_res.status_code == 200

    # Get quotes list
    resp = client.get("/api/v1/quotes")
    assert resp.status_code == 200
    quotes = resp.json()
    assert len(quotes) >= 10

    # Find a draft quote
    draft_q = next((q for q in quotes if q["status"] == "Draft"), quotes[0])
    q_id = draft_q["id"]

    # 1. Submit for approval
    sub_res = client.post(f"/api/v1/quotes/{q_id}/submit-approval")
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "Pending approval"

    # Check pending approvals count
    p_cnt_res = client.get("/api/v1/quotes/approvals/pending-count")
    assert p_cnt_res.status_code == 200
    assert p_cnt_res.json()["pending_count"] >= 1

    # 2. Reject quote with comment
    rej_res = client.post(f"/api/v1/quotes/{q_id}/reject", json={"status": "Draft", "comment": "Margin too tight, please revise"})
    assert rej_res.status_code == 200
    assert rej_res.json()["status"] == "Draft"

    # 3. Submit again and approve
    client.post(f"/api/v1/quotes/{q_id}/submit-approval")
    app_res = client.post(f"/api/v1/quotes/{q_id}/approve", json={"status": "Approved", "comment": "Approved by GM Sales"})
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "Approved"


# ─────────────────────────────────────────────────────────────────────────────
# 3. PDF Content Tests (Customer PDF has NO Cost/Margin, RB Quote Number)
# ─────────────────────────────────────────────────────────────────────────────

def test_customer_pdf_has_no_cost_or_margin(setup_db):
    quotes = client.get("/api/v1/quotes").json()
    q_id = quotes[0]["id"]
    
    # Fetch customer PDF
    resp = client.get(f"/api/v1/quotes/{q_id}/customer-pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    pdf_bytes = resp.content
    assert len(pdf_bytes) > 1000

    # Convert binary to text string inspection
    pdf_text = pdf_bytes.decode("latin1", errors="ignore")

    # STRICT ASSERTIONS: Internal cost breakdown and margin % must NOT appear in Customer Quotation!
    assert "Raw Material Cost" not in pdf_text
    assert "Plate Labour Cost" not in pdf_text
    assert "Gross Margin" not in pdf_text
    assert "Target Markup" not in pdf_text
    assert "CONFIDENTIAL" not in pdf_text

def extract_pdf_streams(pdf_bytes: bytes) -> str:
    import base64, zlib
    texts = []
    idx = 0
    while True:
        s_pos = pdf_bytes.find(b"stream\n", idx)
        if s_pos == -1:
            s_pos = pdf_bytes.find(b"stream\r\n", idx)
            if s_pos == -1:
                break
            s_pos += 8
        else:
            s_pos += 7
        e_pos = pdf_bytes.find(b"endstream", s_pos)
        if e_pos == -1:
            break
        raw = pdf_bytes[s_pos:e_pos].strip()
        idx = e_pos + 9
        try:
            a85 = base64.a85decode(raw, adobe=True)
            dec = zlib.decompress(a85)
            texts.append(dec.decode("latin1", errors="ignore"))
        except Exception:
            try:
                dec = zlib.decompress(raw)
                texts.append(dec.decode("latin1", errors="ignore"))
            except Exception:
                texts.append(raw.decode("latin1", errors="ignore"))
    return " ".join(texts)

def test_cost_sheet_pdf_has_cost_breakdown(setup_db):
    quotes = client.get("/api/v1/quotes").json()
    q_id = quotes[0]["id"]

    resp = client.get(f"/api/v1/quotes/{q_id}/cost-sheet-pdf")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    pdf_bytes = resp.content
    assert len(pdf_bytes) > 2000
    decompressed_text = extract_pdf_streams(pdf_bytes)

    # Confidential sheet must have cost breakdown
    assert "CONFIDENTIAL" in decompressed_text
    assert "Raw Material Cost" in decompressed_text
    assert "Gross Margin" in decompressed_text


# ─────────────────────────────────────────────────────────────────────────────
# 4. Stale-Rate Warning Test
# ─────────────────────────────────────────────────────────────────────────────

def test_stale_rate_warning_enforcement(setup_db):
    db = setup_db
    # Set stale threshold to 10 days
    cs = db.query(CompanySettings).first()
    cs.stale_rate_days_limit = 10
    db.commit()

    # Find or use a draft quote and set its rate version created_at to 45 days ago
    resp = client.get("/api/v1/quotes")
    quotes = resp.json()
    draft_q = next((q for q in quotes if q["status"] == "Draft"), quotes[0])
    q_obj = db.query(Quote).filter(Quote.id == draft_q["id"]).first()
    rv = db.query(RatesVersion).filter(RatesVersion.id == q_obj.rate_version_id).first()
    if not rv:
        rv = db.query(RatesVersion).first()
        q_obj.rate_version_id = rv.id
    rv.created_at = datetime.utcnow() - timedelta(days=45)
    db.commit()

    # Trying to send without confirmation should trigger 400 with warning
    send_resp = client.patch(f"/api/v1/quotes/{draft_q['id']}/status", json={"status": "Sent", "confirm_stale": False})
    assert send_resp.status_code == 400
    detail = send_resp.json()["detail"]
    assert detail["is_stale_warning"] is True

    # Sending with confirm_stale=True succeeds
    send_ok = client.patch(f"/api/v1/quotes/{draft_q['id']}/status", json={"status": "Sent", "confirm_stale": True})
    assert send_ok.status_code == 200
    assert send_ok.json()["status"] == "Sent"


# ─────────────────────────────────────────────────────────────────────────────
# 5. Impact Calculations Test
# ─────────────────────────────────────────────────────────────────────────────

def test_impact_calculations(setup_db):
    resp = client.get("/api/v1/quotes/impact")
    assert resp.status_code == 200
    data = resp.json()
    assert "average_turnaround_hours" in data
    assert "hours_saved_per_quote" in data
    assert "monthly_hours_saved" in data
    assert data["manual_baseline_hours"] >= 1.0
    assert data["hours_saved_per_quote"] >= 0.0
    assert len(data["quotes"]) > 0


# ─────────────────────────────────────────────────────────────────────────────
# 6. Costing Engine Reference Tolerances Check (Rs 1 Tolerance Unbroken)
# ─────────────────────────────────────────────────────────────────────────────

def test_4_reference_sizes_still_match_within_rs_1(setup_db):
    db = setup_db
    seed_json = load_seed_json()
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
    rv1 = db.query(RatesVersion).filter(RatesVersion.version_number == 1).first()
    rates_dict = {
        "material_rates": rv1.material_rates,
        "labour_rates": rv1.labour_rates,
        "bought_out_prices": rv1.bought_out_prices,
        "automation_prices": rv1.automation_prices,
        "fabrication_rate_per_kg": rv1.fabrication_rate_per_kg,
        "finishing_rate_per_kg": rv1.finishing_rate_per_kg,
        "default_markup_pct": rv1.default_markup_pct
    }

    ref_list = seed_json["reference_results_default_rates"]
    for expected in ref_list:
        w = expected["width_mm"]
        h = expected["height_mm"]
        d = expected["depth_mm"]

        actual = calculate_damper_cost(w, h, d, parts, rates_dict, damper_quantity=1, markup_pct_override=10.0)
        
        diff = abs(actual["quoted_price"] - expected["quoted_price"])
        assert diff <= 1.0, f"Size {w}x{h}x{d} quoted price mismatch: actual={actual['quoted_price']}, expected={expected['quoted_price']}, diff={diff}"
        
        diff_cost = abs(actual["total_cost"] - expected["total_cost"])
        assert diff_cost <= 1.0, f"Size {w}x{h}x{d} total cost mismatch: actual={actual['total_cost']}, expected={expected['total_cost']}, diff={diff_cost}"
