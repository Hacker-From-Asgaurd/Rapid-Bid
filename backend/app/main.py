import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base, SessionLocal, migrate_db
from app.seed import seed_database
from app.api import auth, quotes, rates, dashboard, settings as company_settings_router, admin as admin_router, demo as demo_router

# Ensure tables exist and seed default data
Base.metadata.create_all(bind=engine)
migrate_db(engine)
try:
    db = SessionLocal()
    seed_database(db)
    db.close()
except Exception as e:
    print("Database initialization check:", e)

app = FastAPI(
    title="Rapid Bid API",
    description="Rapid Bid API - Industrial Valve & Damper Costing and CPQ Suite",
    version="2.0.0"
)

# Parse allowed origins from environment variable or settings
raw_origins = os.getenv("ALLOWED_ORIGINS", settings.ALLOWED_ORIGINS)
origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers for /api/v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(quotes.router, prefix=settings.API_V1_STR)
app.include_router(rates.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(company_settings_router.router, prefix=settings.API_V1_STR)
app.include_router(admin_router.router, prefix=settings.API_V1_STR)
app.include_router(demo_router.router, prefix=settings.API_V1_STR)

# Also mount under /api for frontend backward compatibility
app.include_router(auth.router, prefix="/api")
app.include_router(quotes.router, prefix="/api")
app.include_router(rates.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(company_settings_router.router, prefix="/api")
app.include_router(admin_router.router, prefix="/api")
app.include_router(demo_router.router, prefix="/api")

@app.get("/")
def root():
    return {
        "app": "Damper Quote Pro",
        "status": "online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/api/health")
@app.get("/health")
def health():
    return {"status": "healthy"}
