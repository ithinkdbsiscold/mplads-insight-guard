import pytest
from unittest.mock import patch
from sqlalchemy.engine import Engine

from models.database import _make_engine
from app.config import settings

def test_postgresql_driver_conversion():
    """Ensure standard postgres:// and postgresql:// URLs are converted to use psycopg."""
    
    # Test postgres://
    with patch.object(settings, 'database_url', 'postgres://user:pass@host:5432/db'):
        engine = _make_engine()
        assert isinstance(engine, Engine)
        assert engine.url.drivername == "postgresql+psycopg"
        assert engine.url.host == "host"

    # Test postgresql://
    with patch.object(settings, 'database_url', 'postgresql://user:pass@host:5432/db'):
        engine = _make_engine()
        assert isinstance(engine, Engine)
        assert engine.url.drivername == "postgresql+psycopg"
        
    # Test that already correct URL is preserved
    with patch.object(settings, 'database_url', 'postgresql+psycopg://user:pass@host:5432/db'):
        engine = _make_engine()
        assert isinstance(engine, Engine)
        assert engine.url.drivername == "postgresql+psycopg"

def test_sqlite_driver_preserved():
    """Ensure sqlite URLs are untouched and correctly trigger SQLite-specific settings."""
    with patch.object(settings, 'database_url', 'sqlite:///./data/test.db'):
        engine = _make_engine()
        assert isinstance(engine, Engine)
        assert engine.url.drivername == "sqlite"
