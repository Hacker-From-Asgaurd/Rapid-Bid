import io
import openpyxl
from app.services.excel_service import generate_quote_excel

def test_excel_export_member_vs_admin():
    sample_quote = {
        "id": 999,
        "quote_number": "DQ-TEST-001",
        "client_name": "Test Client",
        "project_name": "Test Project",
        "damper_type": "rack-pinion",
        "width_mm": 1000,
        "height_mm": 1000,
        "depth_mm": 450,
        "quantity": 1,
        "is_admin": False,
        "parts_cost": 50000.0,
        "bought_outs_total": 20000.0,
        "total_damper_cost": 70000.0,
        "total_price": 85000.0,
        "fabrication_lines": [
            {
                "sr_no": 1,
                "part_name": "Housing Side Plate A",
                "dim_1": 8900.0,
                "dim_2": 450.0,
                "dim_3": 6.0,
                "quantity": 2,
                "total_weight": 377.3,
                "moc": "IS 2062 Gr.B",
                "material_rate": 82.0,
                "plate_labour_rate": 20.0,
                "rolling_cost": 0.0,
                "per_piece_machining": 250.0,
                "error_allowance": 0.0
            },
            {
                "sr_no": 2,
                "part_name": "Housing Side Plate B",
                "dim_1": 8900.0,
                "dim_2": 450.0,
                "dim_3": 6.0,
                "quantity": 2,
                "total_weight": 377.3,
                "moc": "IS 2062 Gr.B",
                "material_rate": 82.0,
                "plate_labour_rate": 20.0,
                "rolling_cost": 0.0,
                "per_piece_machining": 250.0,
                "error_allowance": 0.0
            }
        ]
    }

    # 1. Test Member Export (is_admin = False)
    member_excel_bytes = generate_quote_excel(sample_quote)
    wb_member = openpyxl.load_workbook(io.BytesIO(member_excel_bytes))
    ws_member = wb_member["Cost Sheet"]
    
    header_row_member = None
    for r in range(1, 10):
        vals = [str(ws_member.cell(row=r, column=c).value).strip() for c in range(1, 20)]
        if any("sr.no" in v.lower() for v in vals):
            header_row_member = vals
            break
            
    assert header_row_member is not None, "Header row not found in member sheet"
    # Individual rates/costs should not be columns in member sheet
    assert not any("rate" in v.lower() for v in header_row_member), f"Member export should not have individual Rate column: {header_row_member}"
    assert not any("rm cost" in v.lower() for v in header_row_member), f"Member export should not have individual RM Cost column: {header_row_member}"
    assert any("moc" in v.lower() for v in header_row_member), "Member export should include MOC"
    assert any("total weight" in v.lower() for v in header_row_member), "Member export should include Total Weight"

    # 2. Test Admin Export (is_admin = True)
    admin_quote = dict(sample_quote)
    admin_quote["is_admin"] = True
    admin_excel_bytes = generate_quote_excel(admin_quote)
    wb_admin = openpyxl.load_workbook(io.BytesIO(admin_excel_bytes))
    ws_admin = wb_admin["Cost Sheet"]
    
    header_row_admin = None
    for r in range(1, 10):
        vals = [str(ws_admin.cell(row=r, column=c).value).strip() for c in range(1, 20)]
        if any("sr.no" in v.lower() for v in vals):
            header_row_admin = vals
            break
            
    assert header_row_admin is not None, "Header row not found in admin sheet"
    assert any("rate" in v.lower() for v in header_row_admin), "Admin export must have Rate column"
    assert any("rm cost" in v.lower() for v in header_row_admin), "Admin export must have RM Cost column"
    assert any("mfg. cost" in v.lower() for v in header_row_admin), "Admin export must have MFG. COST column"
