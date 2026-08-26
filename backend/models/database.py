"""
MPLADS Guardian — Database Session Factory

Supports SQLite (local dev) and PostgreSQL (production).
The DATABASE_URL environment variable controls which is used.

SQLite:   sqlite:///./data/guardian.db
Postgres: postgresql+psycopg://user:password@host:5432/db
"""

from __future__ import annotations

import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from models.orm import Base
from app.config import settings

logger = logging.getLogger(__name__)


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


def _make_engine():
    url = settings.database_url
    
    # Force the modern psycopg 3 driver for Render/Supabase standard Postgres URLs
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    kwargs = {}

    if _is_sqlite(url):
        # SQLite: single-file, no connection pooling needed
        kwargs["connect_args"] = {"check_same_thread": False}
        kwargs["pool_pre_ping"] = True
    else:
        # PostgreSQL production settings
        kwargs["pool_pre_ping"] = True
        kwargs["pool_size"] = 5
        kwargs["max_overflow"] = 10
        kwargs["pool_timeout"] = 30       # seconds to wait for a connection
        kwargs["pool_recycle"] = 1800     # recycle connections after 30 minutes

    return create_engine(url, **kwargs)


engine = _make_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def apply_migrations() -> None:
    """Lightweight startup migration for existing SQLite databases only."""
    if not _is_sqlite(settings.database_url):
        return  # PostgreSQL uses Alembic — skip

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
    """
    Startup database readiness check.

    - SQLite (development): auto-create tables + apply lightweight migrations.
    - PostgreSQL (production): tables must be managed by Alembic.
    """
    if _is_sqlite(settings.database_url):
        logger.info("SQLite mode — auto-creating tables")
        Base.metadata.create_all(bind=engine)
        apply_migrations()
    else:
        logger.info("PostgreSQL mode — tables managed by Alembic")


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
