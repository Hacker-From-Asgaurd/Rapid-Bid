import io
from html import escape
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from typing import Dict, Any, Optional

def fmt_inr(val: float) -> str:
    """Formats number in Indian Rupees format"""
    if val is None:
        return "Rs. 0.00"
    return f"Rs. {val:,.2f}"

def _format_quote_number(q_num: str) -> str:
    if not q_num:
        return "RB-2026-0001"
    if q_num.startswith("Q-"):
        return "RB-" + q_num[2:]
    return q_num

def generate_customer_quote_pdf(quote_data: Dict[str, Any], company_settings: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Customer quotation PDF:
    - Specifications, price per unit, quantity, totals, GST, terms, validity date
    - Quote number format: RB-YYYY-####
    - Company details from settings
    - MUST NOT SHOW ANY INTERNAL COST OR MARGIN
    - Mark estimated sizes 'Estimated - to be verified by engineering'
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    style_company_name = ParagraphStyle(
        'CompanyName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#1E3A8A')
    )
    style_company_sub = ParagraphStyle(
        'CompanySub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#4B5563')
    )
    style_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#111827'),
        alignment=1
    )
    style_sec_head = ParagraphStyle(
        'SecHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor('#1E3A8A')
    )
    style_body = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1F2937')
    )
    style_body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#111827')
    )
    style_badge_est = ParagraphStyle(
        'BadgeEst',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#B45309'),
        alignment=1
    )
    style_badge_ver = ParagraphStyle(
        'BadgeVer',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#15803D'),
        alignment=1
    )

    story = []

    cs = company_settings or {}
    comp_name = cs.get("company_name", "RAPID BID INDUSTRIAL ENGINEERING • PUNE")
    comp_addr = cs.get("address", "Plot No. W-45, MIDC Bhosari Industrial Area, Pune 411026, Maharashtra, India")
    comp_gstin = cs.get("gstin", "27AABCP1234F1Z9")
    comp_email = cs.get("email", "quotes@rapidbid.in")
    comp_phone = cs.get("phone", "+91 20 2712 8899")
    validity_days = cs.get("quote_validity_days") or cs.get("validity_days", 30)

    # 1. Header with Company Info & Quote Meta
    comp_info = [
        Paragraph(f"<b>{comp_name}</b>", style_company_name),
        Paragraph(comp_addr, style_company_sub),
        Paragraph(f"Tel: {comp_phone} | Email: {comp_email} | GSTIN: {comp_gstin}", style_company_sub)
    ]
    
    raw_q_num = quote_data.get("quote_number", "RB-2026-0001")
    q_num = _format_quote_number(raw_q_num)
    created_at = quote_data.get("created_at")
    if isinstance(created_at, datetime):
        created_at_str = created_at.strftime("%d-%b-%Y")
    elif created_at:
        created_at_str = str(created_at)[:10]
    else:
        created_at_str = datetime.now().strftime("%d-%b-%Y")
    
    meta_info = [
        Paragraph(f"<b>QUOTATION REF:</b> {q_num}", style_body_bold),
        Paragraph(f"<b>Date:</b> {created_at_str}", style_body),
        Paragraph(f"<b>Validity:</b> {validity_days} Days from date of issue", style_body),
        Paragraph(f"<b>Status:</b> {quote_data.get('status', 'Draft')}", style_body)
    ]

    header_table = Table([[comp_info, meta_info]], colWidths=[350, 190])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#1E3A8A'), spaceBefore=2, spaceAfter=6))

    # Title
    story.append(Paragraph("COMMERCIAL & TECHNICAL QUOTATION", style_title))
    story.append(Spacer(1, 6))

    # Accuracy status badge
    accuracy_label = quote_data.get("accuracy_label") or quote_data.get("accuracy", {}).get("accuracy_label")
    is_estimated = (accuracy_label != "Verified size") if accuracy_label else quote_data.get("is_scaled", False)

    badge_rows = []
    if is_estimated:
        badge_rows.append([Paragraph("<b>Estimated - to be verified by engineering</b>", style_badge_est)])
    else:
        badge_rows.append([Paragraph("<b>Verified Size - Certified Cost Model</b>", style_badge_ver)])

    badge_table = Table(badge_rows, colWidths=[540])
    badge_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7') if is_estimated else colors.HexColor('#DCFCE7')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#F59E0B') if is_estimated else colors.HexColor('#16A34A')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(badge_table)
    story.append(Spacer(1, 8))

    # 2. Customer & Project Details
    cust_data = [
        [Paragraph("<b>CUSTOMER / CLIENT:</b>", style_body_bold), Paragraph("<b>PROJECT DETAILS:</b>", style_body_bold)],
        [
            Paragraph(f"<b>Client:</b> {quote_data.get('customer_name', 'M/s Industrial Client')}<br/>"
                      f"<b>Company:</b> {quote_data.get('customer_company', quote_data.get('customer_name', 'Client'))}<br/>"
                      f"<b>Contact:</b> {quote_data.get('customer_email', 'procurement@client.com')} | {quote_data.get('customer_phone', '+91 20 0000 0000')}", style_body),
            Paragraph(f"<b>Project:</b> {quote_data.get('project_name', 'Flue Gas Isolation Damper')}<br/>"
                      f"<b>Application:</b> Industrial Duct Airflow Isolation & Control<br/>"
                      f"<b>RFQ Notes:</b> {escape(str(quote_data.get('rfq_notes') or 'Standard Scope of Supply'))}", style_body)
        ]
    ]
    t_cust = Table(cust_data, colWidths=[270, 270])
    t_cust.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_cust)
    story.append(Spacer(1, 8))

    # 3. Technical Specifications
    W = quote_data.get("width_mm", 3000)
    H = quote_data.get("height_mm", 3000)
    D = quote_data.get("depth_mm", 450)
    qty = quote_data.get("quantity") or quote_data.get("rfq", {}).get("quantity") or 1
    total_wt = quote_data.get("total_weight_kg") or quote_data.get("totals", {}).get("total_weight_kg", 0)
    flap_mat = quote_data.get("flap_material", "IS 2062")
    act_type = quote_data.get("actuation_type", "Electric Actuator")

    spec_rows = [
        [Paragraph("<b>Parameter</b>", style_body_bold), Paragraph("<b>Specification Value</b>", style_body_bold)],
        [Paragraph("Equipment Type", style_body), Paragraph("Rack and Pinion Heavy-Duty Industrial Sliding-Flap Damper", style_body)],
        [Paragraph("Duct Clear Opening", style_body), Paragraph(f"{int(W)} mm (Width) x {int(H)} mm (Height) x {int(D)} mm (Depth)", style_body)],
        [Paragraph("Housing MOC", style_body), Paragraph("IS 2062 Grade B Structural Carbon Steel", style_body)],
        [Paragraph("Flap / Blade Plate MOC", style_body), Paragraph(f"{flap_mat} (Structural Heavy Duty Reinforced Plate)", style_body)],
        [Paragraph("Shaft & Pinion MOC", style_body), Paragraph("SS 410 Shaft / EN8 Forged Machined Pinions", style_body)],
        [Paragraph("Drive & Actuation", style_body), Paragraph(f"{act_type} with heavy-duty gearbox", style_body)],
        [Paragraph("Estimated Steel Weight (per unit)", style_body), Paragraph(f"{total_wt:,.2f} kg", style_body)],
    ]

    t_spec = Table(spec_rows, colWidths=[200, 340])
    t_spec.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0E7FF')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#C7D2FE')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E7FF')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(Paragraph("TECHNICAL SPECIFICATION SUMMARY", style_sec_head))
    story.append(Spacer(1, 2))
    story.append(t_spec)
    story.append(Spacer(1, 8))

    # 4. Commercial Pricing Table (STRICTLY NO COST OR MARGIN DISPLAYED)
    unit_price = float(
        quote_data.get("quoted_price") or 
        quote_data.get("totals", {}).get("quoted_price") or 
        quote_data.get("quoted_price_unit") or 
        0
    )
    total_price = float(
        quote_data.get("quoted_price_batch") or 
        quote_data.get("totals", {}).get("batch_totals", {}).get("quoted_price") or 
        (unit_price * qty)
    )
    gst_amt = total_price * 0.18
    grand_total = total_price + gst_amt

    comm_rows = [
        [
            Paragraph("<b>Sr</b>", style_body_bold),
            Paragraph("<b>Item Description</b>", style_body_bold),
            Paragraph("<b>Qty</b>", style_body_bold),
            Paragraph("<b>Unit Price (INR)</b>", style_body_bold),
            Paragraph("<b>Total Amount (INR)</b>", style_body_bold)
        ],
        [
            Paragraph("1", style_body),
            Paragraph(f"Design, engineering, manufacturing and supply of Industrial Damper size {int(W)}x{int(H)}x{int(D)} mm with {act_type}", style_body),
            Paragraph(f"{qty} No(s)", style_body),
            Paragraph(fmt_inr(unit_price), style_body),
            Paragraph(fmt_inr(total_price), style_body)
        ],
        ["", "", "", Paragraph("<b>Basic Total:</b>", style_body_bold), Paragraph(fmt_inr(total_price), style_body_bold)],
        ["", "", "", Paragraph("<b>GST @ 18%:</b>", style_body_bold), Paragraph(fmt_inr(gst_amt), style_body)],
        ["", "", "", Paragraph("<b>Grand Total:</b>", style_body_bold), Paragraph(f"<b>{fmt_inr(grand_total)}</b>", style_body_bold)]
    ]
    t_comm = Table(comm_rows, colWidths=[25, 275, 45, 95, 100])
    t_comm.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#9CA3AF')),
        ('INNERGRID', (0, 0), (-1, 1), 0.5, colors.HexColor('#E5E7EB')),
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor('#1E3A8A')),
        ('BACKGROUND', (3, 2), (-1, -1), colors.HexColor('#F9FAFB')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(Paragraph("COMMERCIAL PRICING BREAKDOWN", style_sec_head))
    story.append(Spacer(1, 2))
    story.append(t_comm)
    story.append(Spacer(1, 8))

    # 5. Terms and Conditions
    p_terms = cs.get("payment_terms", "30% advance with Purchase Order; 70% against proforma invoice prior to dispatch.")
    d_terms = cs.get("delivery_terms", "8 to 10 weeks from the date of technically and commercially clear order & drawing approval.")
    w_terms = cs.get("warranty_terms", "18 months from date of supply or 12 months from date of commissioning, whichever is earlier.")

    terms = [
        [Paragraph("<b>STANDARD TERMS & CONDITIONS:</b>", style_body_bold)],
        [Paragraph(f"• <b>Price Basis:</b> Ex-works Pune, packing included. Freight extra at actuals.<br/>"
                   f"• <b>Taxes:</b> GST payable extra as applicable (presently 18%).<br/>"
                   f"• <b>Payment Terms:</b> {p_terms}<br/>"
                   f"• <b>Delivery Period:</b> {d_terms}<br/>"
                   f"• <b>Warranty:</b> {w_terms}<br/>"
                   f"• <b>Validity:</b> {validity_days} days from date of quotation.", style_body)]
    ]
    t_terms = Table(terms, colWidths=[540])
    t_terms.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_terms)
    story.append(Spacer(1, 10))

    # 6. Sign-off block
    sign_block = [
        [Paragraph("Prepared by: <b>Rapid Bid Cost Engineering</b>", style_body),
         Paragraph(f"For <b>{comp_name}</b>", style_body_bold)],
        ["", Paragraph("<br/><br/><b>Authorized Signatory</b>", style_body)]
    ]
    t_sign = Table(sign_block, colWidths=[270, 270])
    story.append(t_sign)

    doc.build(story)
    return buffer.getvalue()


def generate_internal_cost_sheet_pdf(quote_data: Dict[str, Any], company_settings: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Internal cost sheet PDF:
    - Confidential Internal Estimation Sheet
    - Full cost breakdown (Raw material, manufacturing, bought out, automation, fabrication, basic, total)
    - Target markup %, gross margin %, rate version and rate snapshot
    - Detailed BOM lines table with costs
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=32,
        leftMargin=32,
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    style_title = ParagraphStyle(
        'IntTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#7F1D1D'), # Dark red confidential
        alignment=1
    )
    style_sec_head = ParagraphStyle(
        'SecHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.HexColor('#1E3A8A')
    )
    style_body = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#1F2937')
    )
    style_body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#111827')
    )
    style_confidential = ParagraphStyle(
        'Conf',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#B91C1C'),
        alignment=1
    )

    story = []

    raw_q_num = quote_data.get("quote_number", "RB-2026-0001")
    q_num = _format_quote_number(raw_q_num)
    totals = quote_data.get("totals") or {}
    
    W = quote_data.get("width_mm", 3000)
    H = quote_data.get("height_mm", 3000)
    D = quote_data.get("depth_mm", 450)
    qty = quote_data.get("quantity") or quote_data.get("rfq", {}).get("quantity") or 1

    # Header
    story.append(Paragraph("<b>STRICTLY CONFIDENTIAL — INTERNAL COST ESTIMATION SHEET</b>", style_confidential))
    story.append(Paragraph(f"RAPID BID COST ENGINEERING • QUOTE REF: {q_num}", style_title))
    story.append(Spacer(1, 4))

    # Meta Info Table
    meta_rows = [
        [
            Paragraph(f"<b>Customer:</b> {quote_data.get('customer_name', 'Client')}", style_body),
            Paragraph(f"<b>Project:</b> {quote_data.get('project_name', 'Project')}", style_body),
            Paragraph(f"<b>Date:</b> {datetime.now().strftime('%d-%b-%Y')}", style_body)
        ],
        [
            Paragraph(f"<b>Size:</b> {int(W)} x {int(H)} x {int(D)} mm", style_body),
            Paragraph(f"<b>Quantity:</b> {qty} Unit(s)", style_body),
            Paragraph(f"<b>Status:</b> {quote_data.get('status', 'Draft')}", style_body_bold)
        ]
    ]
    t_meta = Table(meta_rows, colWidths=[180, 200, 168])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F3F4F6')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#9CA3AF')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # Internal Cost & Margin Summary Table
    rm_cost = float(totals.get("raw_material_cost") or quote_data.get("raw_material_cost") or 0)
    mfg_cost = float(totals.get("mfg_cost") or quote_data.get("mfg_cost") or 0)
    fab_cost = float(totals.get("fabrication_cost") or quote_data.get("fabrication_cost") or 0)
    auto_cost = float(totals.get("automation_cost") or quote_data.get("automation_cost") or 0)
    basic_cost = float(totals.get("basic_cost") or quote_data.get("basic_cost") or 0)
    total_cost = float(totals.get("total_cost") or quote_data.get("total_cost") or 0)
    quoted_price = float(totals.get("quoted_price") or quote_data.get("quoted_price") or 0)
    markup_pct = float(totals.get("markup_pct") or quote_data.get("markup_pct") or 10.0)
    margin_pct = float(totals.get("margin_pct") or quote_data.get("margin_pct") or 0.0)
    total_wt = float(totals.get("total_weight_kg") or quote_data.get("total_weight_kg") or 0)

    summary_rows = [
        [
            Paragraph("<b>Cost Element (Unit)</b>", style_body_bold),
            Paragraph("<b>Unit Cost (INR)</b>", style_body_bold),
            Paragraph("<b>Commercial Metric</b>", style_body_bold),
            Paragraph("<b>Value</b>", style_body_bold)
        ],
        [
            Paragraph("Raw Material Cost", style_body),
            Paragraph(fmt_inr(rm_cost), style_body),
            Paragraph("Target Markup %", style_body),
            Paragraph(f"{markup_pct:.2f}%", style_body_bold)
        ],
        [
            Paragraph("Labour & Machining Cost", style_body),
            Paragraph(fmt_inr(mfg_cost), style_body),
            Paragraph("Gross Margin %", style_body_bold),
            Paragraph(f"<b>{margin_pct:.2f}%</b>", style_body_bold)
        ],
        [
            Paragraph("Fabrication Cost", style_body),
            Paragraph(fmt_inr(fab_cost), style_body),
            Paragraph("Unit Quoted Price", style_body_bold),
            Paragraph(fmt_inr(quoted_price), style_body_bold)
        ],
        [
            Paragraph("Automation & Drives", style_body),
            Paragraph(fmt_inr(auto_cost), style_body),
            Paragraph(f"Batch Quoted Price ({qty}x)", style_body_bold),
            Paragraph(fmt_inr(quoted_price * qty), style_body_bold)
        ],
        [
            Paragraph("<b>Total Unit Cost</b>", style_body_bold),
            Paragraph(f"<b>{fmt_inr(total_cost)}</b>", style_body_bold),
            Paragraph("Total Steel Weight", style_body),
            Paragraph(f"{total_wt:,.2f} kg ({total_wt * qty:,.2f} kg batch)", style_body)
        ]
    ]
    t_summary = Table(summary_rows, colWidths=[140, 134, 134, 140])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E5E7EB')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#6B7280')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D1D5DB')),
        ('BACKGROUND', (0, 5), (1, 5), colors.HexColor('#FEF3C7')),
        ('BACKGROUND', (2, 2), (3, 2), colors.HexColor('#DCFCE7')),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
    ]))
    story.append(Paragraph("INTERNAL COST & MARGIN BREAKDOWN", style_sec_head))
    story.append(Spacer(1, 2))
    story.append(t_summary)
    story.append(Spacer(1, 6))

    # Rates Snapshot Table
    rates_used = quote_data.get("rates_snapshot") or {}
    mat_rates = rates_used.get("material_rates") or {}
    story.append(Paragraph(f"ACTIVE RATES SNAPSHOT (Version: {rates_used.get('version_number', 1)})", style_sec_head))
    rate_line = f"IS 2062: Rs {mat_rates.get('IS 2062', 74.5)}/kg | SS 304: Rs {mat_rates.get('SS 304', 245.0)}/kg | SS 304L: Rs {mat_rates.get('SS 304L', 260.0)}/kg | SS 316: Rs {mat_rates.get('SS 316', 360.0)}/kg | Fab: Rs {rates_used.get('fabrication_rate_per_kg', 96.0)}/kg"
    story.append(Paragraph(rate_line, style_body))
    story.append(Spacer(1, 6))

    # Detailed BOM Table
    lines = quote_data.get("lines") or []
    if lines:
        story.append(Paragraph(f"BILL OF MATERIALS SCHEDULE ({len(lines)} Components)", style_sec_head))
        bom_rows = [
            [
                Paragraph("<b>#</b>", style_body_bold),
                Paragraph("<b>Component Description</b>", style_body_bold),
                Paragraph("<b>Dims (mm)</b>", style_body_bold),
                Paragraph("<b>Qty</b>", style_body_bold),
                Paragraph("<b>MOC</b>", style_body_bold),
                Paragraph("<b>Wt (kg)</b>", style_body_bold),
                Paragraph("<b>RM Cost</b>", style_body_bold),
                Paragraph("<b>Mfg Cost</b>", style_body_bold),
                Paragraph("<b>Total (INR)</b>", style_body_bold)
            ]
        ]
        for l in lines:
            d_str = f"{l.get('dim_1', 0)} x {l.get('dim_2', 0)}" + (f" x {l.get('dim_3')}" if l.get('dim_3') else "")
            edit_mark = " *" if l.get("is_manually_edited") else ""
            bom_rows.append([
                Paragraph(str(l.get("sr_no", "-")), style_body),
                Paragraph(escape(str(l.get("part_name", ""))) + edit_mark, style_body),
                Paragraph(d_str, style_body),
                Paragraph(str(l.get("qty", 1)), style_body),
                Paragraph(escape(str(l.get("moc", "IS 2062"))), style_body),
                Paragraph(f"{float(l.get('weight', 0)):.1f}", style_body),
                Paragraph(fmt_inr(float(l.get("rm_cost", 0))), style_body),
                Paragraph(fmt_inr(float(l.get("mfg_cost_total", l.get("mfg_cost", 0)))), style_body),
                Paragraph(fmt_inr(float(l.get("line_total", l.get("total_cost", 0)))), style_body)
            ])
        t_bom = Table(bom_rows, colWidths=[20, 140, 75, 25, 55, 45, 60, 60, 68], repeatRows=1)
        t_bom.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#9CA3AF')),
            ('INNERGRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#E5E7EB')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(t_bom)

    doc.build(story)
    return buffer.getvalue()


def generate_quote_pdf(quote_data: Dict[str, Any], company_settings: Optional[Dict[str, Any]] = None, pdf_type: str = "customer") -> bytes:
    """Dispatches to customer or cost sheet PDF based on pdf_type"""
    if pdf_type == "cost_sheet":
        return generate_internal_cost_sheet_pdf(quote_data, company_settings)
    return generate_customer_quote_pdf(quote_data, company_settings)
