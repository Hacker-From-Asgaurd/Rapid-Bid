from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.demo_data import load_demo_data

router = APIRouter(prefix="/demo", tags=["Demo"])

@router.post("/load")
def trigger_load_demo_data(db: Session = Depends(get_db)):
    load_demo_data(db)
    return {"status": "success", "message": "Demo data loaded: 4 customers, 10 quotes with full approval, accuracy, and stale rate coverage."}
