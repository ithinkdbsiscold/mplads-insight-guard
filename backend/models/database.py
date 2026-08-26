"""
MPLADS Guardian — Database Session Factory

Supports SQLite (local dev) and PostgreSQL (production).
The DATABASE_URL environment variable controls which is used.

SQLite:  sqlite:///./data/guardian.db
Postgres: postgresql://user:password@host:5432/guardian_db
"""

from __future__ import annotations

import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from models.orm import Base
from app.config import settings

logger = logging.getLogger(__name__)


def _make_engine():
    url = settings.database_url
    kwargs = {}
    if url.startswith("sqlite"):
        # Required for SQLite to work safely with FastAPI's async threads
        kwargs["connect_args"] = {"check_same_thread": False}
        kwargs["pool_pre_ping"] = True
    else:
        kwargs["pool_pre_ping"] = True
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
    return create_engine(url, **kwargs)


engine = _make_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def apply_migrations() -> None:
    """Lightweight startup migration for existing SQLite databases."""
    if engine.url.drivername == "sqlite":
        with engine.connect() as conn:
            try:
                result = conn.execute(text("PRAGMA table_info(sync_metadata)")).fetchall()
                cols = [row[1] for row in result]
                if "failed_datasets" not in cols and cols:
                    logger.info("Migrating sync_metadata: adding failed_datasets column")
                    conn.execute(text("ALTER TABLE sync_metadata ADD COLUMN failed_datasets TEXT"))
                    conn.commit()
            except Exception as exc:
                logger.error("Migration failed: %s", exc)


def create_all_tables() -> None:
    """Create all tables if they don't exist. Safe to call on startup."""
    Base.metadata.create_all(bind=engine)
    apply_migrations()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
