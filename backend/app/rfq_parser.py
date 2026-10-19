import re
from typing import Dict, Any, Optional

SAMPLE_RFQS = [
    {
        "id": "sample-1",
        "title": "NTPC Flue Gas Isolation (3000x3000x450 mm)",
        "customer": "NTPC Limited",
        "project": "Super Thermal Power Flue Gas Isolation Unit #4",
        "text": """Dear Pune Valve & Damper Team,

Please quote your best techno-commercial price for the following requirement:
Item: Rack and Pinion Heavy-Duty Isolation Damper
Size: 3000 mm (W) x 3000 mm (H) x 450 mm (D)
MOC: IS 2062 Gr B Carbon Steel casing with SS 304L blade
Quantity: 2 Nos.
Actuation: Electric Actuator (Auma make, 415V 3-Ph, IP68 with local control station)
Operating Pressure: 450 mmWC
Operating Temperature: 220 °C
Scope includes supply, testing, and inspection certificates.

Regards,
P. Ramesh
Senior Manager (Contracts)
NTPC Limited"""
    },
    {
        "id": "sample-2",
        "title": "Tata Steel Blast Furnace Gas (2000x2000x400 mm)",
        "customer": "Tata Steel Limited",
        "project": "Blast Furnace Gas Interconnect Line #2",
        "text": """RFQ Ref: TSL/BFG/2026/891
To: Estimation Department, Rapid Bid / Pune Valve & Damper

We require urgent quote for:
Sliding Flap Damper 2000 x 2000 x 400 mm
Casing & Flap Material: SS 304
Actuator: Pneumatic Cylinder with double acting positioner & solenoid valve
Qty: 1 Unit
Design Pressure: 600 mmWC
Design Temperature: 280 deg C
Delivery required: 6 to 8 weeks.

Best regards,
Sunil Mohanty
Tata Steel Kalinganagar"""
    },
    {
        "id": "sample-3",
        "title": "JSW Cement Kiln Exhaust (4500x3500x500 mm)",
        "customer": "JSW Steel Ltd",
        "project": "Kiln Exhaust Gas ESP Bypass",
        "text": """Enquiry from JSW Vijayanagar Works:
Equipment: Heavy-Duty Industrial Damper
Clear Duct Opening: 4500x3500x500 mm
Material of Construction: IS 2062 structural steel
Operation: Electric Motorized Actuator with bevel gear
Total Quantity: 4 nos
Gas conditions: Dust laden air at 150 °C, negative pressure -350 mmWC.
Please submit technical datasheet and unit rates with GST.

Regards,
Purchase Department, JSW Steel Ltd"""
    },
    {
        "id": "sample-4",
        "title": "UltraTech Duct Isolation (3 m by 3 m)",
        "customer": "UltraTech Cement",
        "project": "Raw Mill Duct Vent Isolation",
        "text": """Kindly provide commercial quote for:
1 unit duct isolation damper size 3 m by 3 m (depth 450 mm).
Material: SS 316 for corrosive gas service.
Actuation: Manual handwheel with worm reduction gearbox.
Operating Temp: 180 C, Pressure: 300 Pa.
Required within 4 weeks.

Thanks,
M. Sharma
UltraTech Procurement"""
    },
    {
        "id": "sample-5",
        "title": "BHEL Boiler ID Fan Damper (6000x6000x800 mm)",
        "customer": "Bharat Heavy Electricals Ltd",
        "project": "800 MW Boiler ID Fan Discharge Gas Damper",
        "text": """BHEL Technical Specification Enquiry:
Item: Heavy Structural Damper
Duct Size: 6000 X 6000 X 800 mm
Material: Galvanized steel frame with heat resistant paint
Quantity: 1 No.
Actuation: Heavy-Duty Electric Actuator with integral starter
Temp: 350 deg C, Pressure: 1200 mmWG.

Materials Management Dept
BHEL Haridwar"""
    },
    {
        "id": "sample-6",
        "title": "Reliance Flare Gas Header (2500x2500x450 mm)",
        "customer": "Reliance Industries Limited",
        "project": "Off-Gas Flare Isolation Revamp",
        "category": "damper",
        "text": """RIL Jamnagar Refinery RFQ:
Looking for 3 units of Sliding Gate Damper, size 2500 x 2500 x 450.
Body & trim MOC: SS 304L.
Actuation: Pneumatic cylinder with fail-safe spring return.
Design conditions: 80 °C, 5 kPa pressure.
Please confirm compliance with standard warranty of 18 months.

Materials & Procurement Division
Reliance Industries Limited"""
    },
    {
        "id": "sample-7",
        "title": "ONGC Offshore (Triple Offset Butterfly Valve 1200 NB Class 150)",
        "customer": "Oil and Natural Gas Corporation (ONGC)",
        "project": "Mumbai High South Offshore Platform Seawater Header",
        "category": "valve",
        "text": """ONGC Tender Ref: ONGC/MR/PROC/2026/VALVE-441
To: Pune Valve & Damper Mfg. Co. Pvt. Ltd.

Please quote for the following high integrity valve requirement:
Item: Triple Offset Metal Seated Butterfly Valve
Nominal Size: 1200 NB (DN 1200 / 48 inch)
Rating: ASME Class 150 (PN 20)
Body & Disc MOC: CF8M (Cast SS 316)
Seat & Trim: Stellite hard-faced metal-to-metal zero leakage
Face to Face: ASME B16.10 / API 609 Cat B (470 mm)
Quantity: 4 Nos.
Operation: Heavy-Duty Electric Actuator (Auma / Rotork 415V IP68 with Profibus)
Design Pressure: 19.6 bar, Design Temp: 120 °C
Testing: Hydrostatic shell & seat test as per API 598. Third party inspection (TUV/Lloyds).

Best regards,
R. K. Verma
Chief Engineer (Materials & Contracts)
ONGC Mumbai"""
    },
    {
        "id": "sample-8",
        "title": "IOCL Panipat Slurry Line (Knife Gate Valve 1000 NB)",
        "customer": "Indian Oil Corporation Limited (IOCL)",
        "project": "Panipat Refinery Ash & Slurry Discharge Line",
        "category": "valve",
        "text": """Enquiry from Indian Oil Corporation Ltd (IOCL Panipat Refinery):
Item: Unidirectional Knife Gate Valve
Bore Size: 1000 NB (DN 1000 / 40 inch)
Depth / Face to Face: 300 mm
Pressure Rating: PN 10 (150 PSI)
Body MOC: WCB (Cast Carbon Steel ASTM A216)
Gate MOC: SS 316 with hard chrome plating
Quantity: 6 Units
Actuation: Double Acting Pneumatic Cylinder with air filter regulator, solenoid valve 24V DC, and limit switches
Service: Abrasive slurry water at 65 °C, working pressure 6 bar
Flange Drilling: ANSI B16.5 Class 150

Senior Materials Officer
IOCL Panipat Refinery"""
    },
    {
        "id": "sample-9",
        "title": "NTPC Cooling Water Header (Butterfly Valve DN 1200 PN 16)",
        "customer": "NTPC Limited",
        "project": "Kudgi Super Thermal Power CW System",
        "category": "valve",
        "text": """NTPC CW System Expansion:
Equipment: Concentric Double Flanged Butterfly Valve
Size: DN 1200 (1200 mm NB / 48 inch)
Face to Face: 470 mm
Body Material: WCB / Ductile Iron GGG40
Disc: CF8M (SS316)
Liner: Replaceable EPDM resilient seat
Actuator: Heavy-Duty Electric Actuator with integral starter
Total Quantity: 2 Nos.
Working Pressure: 10 bar, Ambient Temp: 45 °C

Procurement Division, NTPC Kudgi"""
    },
    {
        "id": "sample-10",
        "title": "JSW Steel Oxygen Plant (High Pressure Control Valve 1000 NB)",
        "customer": "JSW Steel Ltd",
        "project": "Toranagallu Oxygen Plant Header Isolation",
        "category": "valve",
        "text": """JSW Steel Commercial Enquiry:
Requirement: Rotary Control / Isolation Valve
Nominal Diameter: 1000 NB (DN 1000)
Face-to-face: 350 mm
Pressure Class: ASME Class 300 (51 bar)
MOC: CF8M Stainless Steel Body and Disc, Stellite Seat
Operation: Pneumatic Cylinder Actuator with Smart Positioner
Quantity: 3 Units
Operating Temp: 110 °C, Pressure: 25 bar

Materials Management, JSW Steel Ltd"""
    }
]


def parse_rfq_text(text: str) -> Dict[str, Any]:
    """
    Offline rule-based parser that extracts product parameters from unstructured RFQ text.
    Handles both Dampers and Industrial Valves. Fully offline & deterministic.
    """
    if not text:
        text = ""

    clean_text = text.strip()
    
    # 1. Product Type
    product_type = "damper"
    product_type_found = False
    raw_pt = ""
    lower = clean_text.lower()
    
    if any(k in lower for k in ["triple offset", "knife gate", "ball valve", "globe valve", "gate valve", "butterfly valve", "control valve", "check valve", "valve"]):
        product_type = "valve"
        product_type_found = True
        if "triple offset" in lower:
            raw_pt = "Triple Offset Butterfly Valve"
        elif "knife gate" in lower:
            raw_pt = "Knife Gate Valve"
        elif "ball valve" in lower:
            raw_pt = "Ball Valve"
        elif "butterfly valve" in lower:
            raw_pt = "Butterfly Valve"
        elif "control valve" in lower:
            raw_pt = "Control Valve"
        else:
            raw_pt = "Industrial Valve"
    elif any(k in lower for k in ["damper", "sliding flap", "sliding gate", "louver", "guillotine"]):
        product_type = "damper"
        product_type_found = True
        raw_pt = "Damper"

    # 2. Dimensions (Width x Height x Depth or Valve Bore/F2F)
    w_mm, h_mm, d_mm = 3000.0, 3000.0, 450.0
    dim_found = False
    raw_dim = ""

    # Pattern A: Meters like "3 m by 3 m by 0.45 m" or "3m x 3m x 0.45m" or "3 m by 3 m"
    m_meter_3 = re.search(r'(\d+(?:\.\d+)?)\s*m\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\s*m\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\s*m', lower)
    m_meter_2 = re.search(r'(\d+(?:\.\d+)?)\s*m\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)\s*m', lower)
    
    # Pattern B: Standard mm "3000 x 3000 x 450", "3000X3000X450", "3000*3000*450", or with (W) x (H) x (D)
    m_mm_3 = re.search(r'(\d{3,5})\s*(?:mm)?(?:\s*\([A-Za-z]\))?\s*(?:x|by|\*|X)\s*(\d{3,5})\s*(?:mm)?(?:\s*\([A-Za-z]\))?\s*(?:x|by|\*|X)\s*(\d{2,4})\s*(?:mm)?(?:\s*\([A-Za-z]\))?', clean_text, re.IGNORECASE)
    m_mm_2 = re.search(r'(\d{3,5})\s*(?:mm)?(?:\s*\([A-Za-z]\))?\s*(?:x|by|\*|X)\s*(\d{3,5})\s*(?:mm)?(?:\s*\([A-Za-z]\))?', clean_text, re.IGNORECASE)

    # Pattern C: Explicit "W: 3000 mm, H: 3000 mm, D: 450 mm" or "Width 3000 ... Height 3000"
    m_exp_w = re.search(r'(?:w|width)\s*(?:=|:|\-)?\s*(\d+(?:\.\d+)?)\s*(mm|m)?', lower)
    m_exp_h = re.search(r'(?:h|height)\s*(?:=|:|\-)?\s*(\d+(?:\.\d+)?)\s*(mm|m)?', lower)
    m_exp_d = re.search(r'(?:d|depth)\s*(?:=|:|\-)?\s*(\d+(?:\.\d+)?)\s*(mm|m)?', lower)

    # Pattern D: Valve Nominal Bore (NB/DN) like "1200 NB", "DN 1200", "DN1200", "400 NB", "48 inch", "24\""
    m_dn = re.search(r'\b(?:dn|nb)\s*[-:]?\s*(\d{2,4})\b', lower)
    if not m_dn:
        m_dn = re.search(r'\b(\d{2,4})\s*(?:mm)?\s*(?:nb|dn)\b', lower)
    m_inch = re.search(r'\b(\d{1,2}(?:\.\d+)?)\s*(?:inch|in|\")\b', lower)
    m_f2f = re.search(r'(?:face\s*to\s*face|face-to-face|f2f|depth)\s*[-:]?\s*(\d{2,4})\s*(?:mm)?', lower)

    if m_meter_3:
        w_val = float(m_meter_3.group(1)) * 1000.0
        h_val = float(m_meter_3.group(2)) * 1000.0
        d_val = float(m_meter_3.group(3)) * 1000.0
        w_mm, h_mm, d_mm = round(w_val), round(h_val), round(d_val)
        dim_found = True
        raw_dim = m_meter_3.group(0)
    elif m_mm_3:
        w_mm = float(m_mm_3.group(1))
        h_mm = float(m_mm_3.group(2))
        d_mm = float(m_mm_3.group(3))
        dim_found = True
        raw_dim = m_mm_3.group(0)
    elif m_meter_2:
        w_val = float(m_meter_2.group(1)) * 1000.0
        h_val = float(m_meter_2.group(2)) * 1000.0
        w_mm, h_mm = round(w_val), round(h_val)
        d_search = re.search(r'depth\s*(?:=|:|\-)?\s*(\d+(?:\.\d+)?)\s*(mm|m)?', lower)
        if d_search:
            d_val = float(d_search.group(1))
            if d_search.group(2) == 'm' or d_val < 10:
                d_val *= 1000.0
            d_mm = round(d_val)
        else:
            d_mm = 450.0
        dim_found = True
        raw_dim = m_meter_2.group(0)
    elif m_mm_2:
        w_mm = float(m_mm_2.group(1))
        h_mm = float(m_mm_2.group(2))
        d_search = re.search(r'depth\s*(?:=|:|\-)?\s*(\d+(?:\.\d+)?)\s*(mm|m)?', lower)
        if d_search:
            d_val = float(d_search.group(1))
            if d_search.group(2) == 'm' or d_val < 10:
                d_val *= 1000.0
            d_mm = round(d_val)
        else:
            d_mm = 450.0
        dim_found = True
        raw_dim = m_mm_2.group(0)
    elif m_exp_w and m_exp_h:
        w_val = float(m_exp_w.group(1))
        if m_exp_w.group(2) == 'm' or w_val <= 10:
            w_val *= 1000.0
        h_val = float(m_exp_h.group(1))
        if m_exp_h.group(2) == 'm' or h_val <= 10:
            h_val *= 1000.0
        d_val = 450.0
        if m_exp_d:
            d_val = float(m_exp_d.group(1))
            if m_exp_d.group(2) == 'm' or d_val <= 2:
                d_val *= 1000.0
        w_mm, h_mm, d_mm = round(w_val), round(h_val), round(d_val)
        dim_found = True
        raw_dim = f"W:{w_mm} H:{h_mm} D:{d_mm}"
    elif m_dn:
        bore = float(m_dn.group(1))
        w_mm, h_mm = bore, bore
        dim_found = True
        raw_dim = f"DN {int(bore)} mm ({m_dn.group(0)})"
        if m_f2f:
            d_mm = float(m_f2f.group(1))
        else:
            d_mm = 470.0 if bore >= 1200 else (318.0 if bore >= 800 else (267.0 if bore >= 600 else 178.0))
    elif m_inch and product_type == "valve":
        inches = float(m_inch.group(1))
        bore = round(inches * 25.4)
        w_mm, h_mm = float(bore), float(bore)
        dim_found = True
        raw_dim = f'{m_inch.group(1)}" ({bore} mm NB)'
        if m_f2f:
            d_mm = float(m_f2f.group(1))
        else:
            d_mm = 470.0 if bore >= 1200 else (318.0 if bore >= 800 else (267.0 if bore >= 600 else 178.0))

    # 3. Material of Construction (MOC)
    moc = "IS 2062"
    moc_found = False
    raw_moc = ""

    if re.search(r'\b(?:cf8m|cf-8m|cast\s*ss\s*316)\b', lower):
        moc = "CF8M"
        moc_found = True
        raw_moc = "CF8M (Cast SS 316)"
    elif re.search(r'\b(?:cf8|cf-8|cast\s*ss\s*304)\b', lower):
        moc = "CF8"
        moc_found = True
        raw_moc = "CF8 (Cast SS 304)"
    elif re.search(r'\b(?:wcb|a216|cast\s*carbon\s*steel)\b', lower):
        moc = "WCB"
        moc_found = True
        raw_moc = "WCB (Cast Carbon Steel)"
    elif re.search(r'\b(?:ductile\s*iron|ggg40|di\b)\b', lower):
        moc = "Ductile Iron"
        moc_found = True
        raw_moc = "Ductile Iron GGG40"
    elif re.search(r'\b(?:ss\s*316l|ss316l|316l)\b', lower):
        moc = "SS 316L"
        moc_found = True
        raw_moc = "SS 316L"
    elif re.search(r'\b(?:ss\s*316|ss316|316)\b', lower):
        moc = "SS 316"
        moc_found = True
        raw_moc = "SS 316"
    elif re.search(r'\b(?:ss\s*304l|ss304l|304l)\b', lower):
        moc = "SS 304L"
        moc_found = True
        raw_moc = "SS 304L"
    elif re.search(r'\b(?:ss\s*304|ss304|304)\b', lower):
        moc = "SS 304"
        moc_found = True
        raw_moc = "SS 304"
    elif re.search(r'\b(?:galvanized|galvanised|gi\b|hdg)\b', lower):
        moc = "Galvanized Steel"
        moc_found = True
        raw_moc = "Galvanized Steel"
    elif re.search(r'\b(?:is\s*2062|is2062|mild steel|carbon steel|ms\b)\b', lower):
        moc = "IS 2062"
        moc_found = True
        raw_moc = "IS 2062"

    # 4. Quantity
    qty = 1
    qty_found = False
    raw_qty = ""
    qty_match = re.search(r'(?:qty|quantity|units?|nos?|total\s*quantity)\s*(?:=|:|\-)?\s*(\d+)', lower)
    if not qty_match:
        qty_match = re.search(r'(\d+)\s*(?:nos?\.?|units?|pcs?|pieces?)', lower)

    if qty_match:
        try:
            val = int(qty_match.group(1))
            if 0 < val <= 500:
                qty = val
                qty_found = True
                raw_qty = qty_match.group(0)
        except (ValueError, TypeError):
            pass

    # 5. Actuation Type
    actuation = "Electric Actuator"
    act_found = False
    raw_act = ""

    if any(k in lower for k in ["pneumatic", "air operated", "cylinder", "solenoid"]):
        actuation = "Pneumatic Cylinder"
        act_found = True
        raw_act = "Pneumatic Cylinder"
    elif any(k in lower for k in ["manual", "handwheel", "hand wheel", "lever", "chain wheel", "gear operated"]):
        actuation = "Manual Handwheel"
        act_found = True
        raw_act = "Manual Handwheel"
    elif any(k in lower for k in ["electric", "motorized", "motorised", "actuator", "auma", "rotork", "electrical"]):
        actuation = "Electric Actuator"
        act_found = True
        raw_act = "Electric Actuator"

    # 6. Pressure Mentions
    pressure = None
    press_found = False
    raw_press = ""
    press_match = re.search(r'(\-?\d+(?:\.\d+)?)\s*(mmwc|mm\s*wc|mmwg|mm\s*wg|pa|kpa|bar|psi|mbar)', lower)
    press_class = re.search(r'\b(?:class|rating|pn)\s*[-:]?\s*(\d{2,4})\b', lower)
    if press_match:
        pressure = f"{press_match.group(1)} {press_match.group(2).upper()}"
        press_found = True
        raw_press = press_match.group(0)
    elif press_class:
        pressure = f"{press_class.group(0).upper()}"
        press_found = True
        raw_press = press_class.group(0)

    # 7. Temperature Mentions
    temperature = None
    temp_found = False
    raw_temp = ""
    temp_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:°\s*c|deg\s*c|degc|\bc\b)', clean_text, re.IGNORECASE)
    if temp_match:
        temperature = f"{temp_match.group(1)} °C"
        temp_found = True
        raw_temp = temp_match.group(0)

    # 8. Customer & Project heuristic
    customer_candidate = None
    for s in SAMPLE_RFQS:
        if s["customer"].lower() in lower:
            customer_candidate = s["customer"]
            break
    if not customer_candidate:
        cust_match = re.search(r'(?:to|from|client|customer|m/s)\s*(?:=|:|\-)?\s*([A-Za-z0-9\s,\.]{3,40})', clean_text, re.IGNORECASE)
        if cust_match:
            cand = cust_match.group(1).strip()
            if len(cand) > 3 and not any(w in cand.lower() for w in ["dear", "team", "estimation", "please"]):
                customer_candidate = cand

    return {
        "product_type": {
            "value": product_type,
            "found": product_type_found,
            "raw": raw_pt
        },
        "dimensions": {
            "width_mm": w_mm,
            "height_mm": h_mm,
            "depth_mm": d_mm,
            "found": dim_found,
            "raw": raw_dim
        },
        "material": {
            "value": moc,
            "found": moc_found,
            "raw": raw_moc
        },
        "quantity": {
            "value": qty,
            "found": qty_found,
            "raw": raw_qty
        },
        "actuation": {
            "value": actuation,
            "found": act_found,
            "raw": raw_act
        },
        "pressure": {
            "value": pressure,
            "found": press_found,
            "raw": raw_press
        },
        "temperature": {
            "value": temperature,
            "found": temp_found,
            "raw": raw_temp
        },
        "suggested_customer": customer_candidate,
        "raw_text_length": len(clean_text)
    }
