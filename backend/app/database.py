
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings


DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args=(
        {"check_same_thread": False}
        if DATABASE_URL.startswith("sqlite")
        else {}
    ),
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# Columns added to existing tables by application updates.
MIGRATIONS = {
    "rates_versions": [
        ("multi_blade_rates", "JSON"),
        ("part_rates", "JSON"),
    ],
    "quotes": [
        ("damper_type", "VARCHAR DEFAULT 'rack_and_pinion'"),
        ("multi_blade_config", "JSON"),
        ("approval_comment", "TEXT"),
        ("discount_pct", "FLOAT DEFAULT 0.0"),
        ("rfq_received_at", "TIMESTAMP"),
        ("approved_at", "TIMESTAMP"),
        ("sent_at", "TIMESTAMP"),
    ],
    "company_settings": [
        ("approval_threshold_value", "FLOAT DEFAULT 2500000.0"),
        ("approval_min_margin_pct", "FLOAT DEFAULT 12.0"),
        ("approval_max_discount_pct", "FLOAT DEFAULT 10.0"),
        ("stale_rate_days_limit", "INTEGER DEFAULT 30"),
        ("manual_baseline_hours_per_quote", "FLOAT DEFAULT 4.0"),
    ],
    "verified_sizes": [
        ("damper_type", "VARCHAR DEFAULT 'rack_and_pinion'"),
    ],
    "validation_rules": [
        ("damper_type", "VARCHAR DEFAULT 'all'"),
    ],
}


def migrate_db(eng):
    """
    Add missing columns to existing SQLite or PostgreSQL tables.
    Does not create missing tables or migrate existing data between databases.
    """
    dialect = eng.dialect.name

    if dialect not in ("sqlite", "postgresql"):
        raise RuntimeError(
            f"Unsupported database dialect: {dialect}"
        )

    with eng.begin() as conn:
        for table, columns in MIGRATIONS.items():
            if dialect == "sqlite":
                result = conn.execute(
                    text(f'PRAGMA table_info("{table}")')
                ).fetchall()

                existing_columns = {row[1] for row in result}

            else:
                result = conn.execute(
                    text("""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = current_schema()
                          AND table_name = :table_name
                    """),
                    {"table_name": table},
                ).fetchall()

                existing_columns = {row[0] for row in result}

            # A missing table may be created later by Base.metadata.create_all().
            if not existing_columns:
                continue

            for column, column_type in columns:
                if column in existing_columns:
                    continue

                conn.execute(
                    text(
                        f'ALTER TABLE "{table}" '
                        f'ADD COLUMN "{column}" {column_type}'
                    )
                )


def get_db():
    """Provide a database session to FastAPI endpoints."""
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
