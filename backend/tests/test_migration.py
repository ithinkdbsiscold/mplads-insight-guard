"""
Tests for legacy data migration and SQLite schema updates.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path
from unittest.mock import patch

import pytest
from sqlalchemy import create_engine, text

# Ensure backend root is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.database import apply_migrations, create_all_tables
from models.orm import Base, SyncMetadata
from scripts.sync_mplads import load_json_with_fallback


# ---------------------------------------------------------------------------
# 1. JSON Legacy Encoding Migration Tests
# ---------------------------------------------------------------------------

def test_legacy_cp1252_json_migration(tmp_path):
    """
    Test that a JSON file saved using the default Windows cp1252 charmap
    (containing bytes like 0x92 instead of UTF-8 quotes/unicode) is safely
    loaded, decoded, and rewritten as proper UTF-8 without data loss.
    """
    filepath = tmp_path / "legacy.json"
    
    # We must construct a byte sequence that is valid cp1252 but invalid utf-8.
    # 0x92 in cp1252 is the right single curly quote ('). 
    # In utf-8, 0x92 is a continuation byte and invalid on its own, which triggers the error.
    invalid_utf8_valid_cp1252 = b'[{"name": "Narendra Modi", "quote": "don\x92t"}]'
    filepath.write_bytes(invalid_utf8_valid_cp1252)
    
    # 1. Verify standard utf-8 read fails (this is what crashed the script initially)
    with pytest.raises(UnicodeDecodeError):
        filepath.read_text(encoding="utf-8")
        
    # 2. Use our fallback loader
    loaded_data = load_json_with_fallback(filepath)
    
    # 3. Verify data is intact (the 0x92 byte becomes the unicode character U+2019)
    assert loaded_data[0]["name"] == "Narendra Modi"
    assert loaded_data[0]["quote"] == "don’t"
    
    # 4. Verify file was actually migrated to UTF-8 on disk
    # This read should no longer raise UnicodeDecodeError
    utf8_content = filepath.read_text(encoding="utf-8")
    assert "Narendra Modi" in utf8_content
    assert "don’t" in utf8_content

def test_utf8_json_loads_normally(tmp_path):
    """Test that a file already in UTF-8 loads without triggering migration logic."""
    filepath = tmp_path / "modern.json"
    data = [{"name": "नरेन्द्र मोदी"}]
    
    # Write correct UTF-8
    filepath.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    
    with patch("scripts.sync_mplads.logger.warning") as mock_warn:
        loaded_data = load_json_with_fallback(filepath)
        
    assert loaded_data[0]["name"] == "नरेन्द्र मोदी"
    mock_warn.assert_not_called()


# ---------------------------------------------------------------------------
# 2. SQLite Schema Migration Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def legacy_sqlite_db(tmp_path):
    """Create a raw SQLite database matching the old schema (no failed_datasets column)."""
    db_path = tmp_path / "test_legacy.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create the old sync_metadata table manually
    cursor.execute("""
        CREATE TABLE sync_metadata (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            house VARCHAR(20),
            ls_term INTEGER,
            source VARCHAR(100),
            last_sync DATETIME,
            records_fetched INTEGER,
            records_inserted INTEGER,
            records_updated INTEGER,
            records_skipped INTEGER,
            records_failed INTEGER,
            sync_duration_secs FLOAT,
            data_quality_pct FLOAT,
            status VARCHAR(20),
            error_message TEXT,
            created_at DATETIME
        )
    """)
    
    # Insert a legacy row
    cursor.execute("""
        INSERT INTO sync_metadata (house, ls_term, status) 
        VALUES ('lok_sabha', 18, 'success')
    """)
    conn.commit()
    conn.close()
    
    return db_path

def test_sqlite_schema_migration_adds_column(legacy_sqlite_db):
    """Test that apply_migrations adds the missing failed_datasets column and keeps data."""
    # Create an engine pointing to the legacy DB
    url = f"sqlite:///{legacy_sqlite_db}"
    engine = create_engine(url)
    
    # Verify the column does NOT exist initially
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(sync_metadata)")).fetchall()
        cols = [r[1] for r in result]
        assert "failed_datasets" not in cols
        
    # Apply the migration patch dynamically by overriding the engine used in models.database
    with patch("models.database.engine", engine):
        apply_migrations()
        
    # Verify the column now exists
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(sync_metadata)")).fetchall()
        cols = [r[1] for r in result]
        assert "failed_datasets" in cols
        
        # Verify the old data is still there and failed_datasets is NULL
        rows = conn.execute(text("SELECT house, ls_term, failed_datasets FROM sync_metadata")).fetchall()
        assert len(rows) == 1
        assert rows[0][0] == "lok_sabha"
        assert rows[0][1] == 18
        assert rows[0][2] is None  # Existing rows get NULL
        
def test_sqlite_schema_migration_is_idempotent(legacy_sqlite_db):
    """Test that running the migration twice is safe and doesn't crash."""
    url = f"sqlite:///{legacy_sqlite_db}"
    engine = create_engine(url)
    
    with patch("models.database.engine", engine):
        # Run first time
        apply_migrations()
        # Run second time
        apply_migrations()
        
    # Still just one column, no crash
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(sync_metadata)")).fetchall()
        cols = [r[1] for r in result]
        assert cols.count("failed_datasets") == 1

def test_sync_metadata_insert_after_migration(legacy_sqlite_db):
    """Test that SQLAlchemy can successfully insert a new row after the raw SQLite migration."""
    url = f"sqlite:///{legacy_sqlite_db}"
    engine = create_engine(url)
    
    with patch("models.database.engine", engine):
        apply_migrations()
        
        from sqlalchemy.orm import Session
        with Session(engine) as session:
            new_meta = SyncMetadata(
                house="rajya_sabha",
                failed_datasets='[{"dataset": "works"}]'
            )
            session.add(new_meta)
            session.commit()
            
            # Fetch it back
            saved = session.query(SyncMetadata).filter_by(house="rajya_sabha").first()
            assert saved is not None
            assert saved.failed_datasets == '[{"dataset": "works"}]'

# ---------------------------------------------------------------------------
# 3. Sync Error Handling
# ---------------------------------------------------------------------------

def test_primary_sync_error_not_hidden(tmp_path):
    """
    Ensure that if a primary sync error occurs, and then writing metadata fails,
    the metadata failure doesn't hide the primary error.
    """
    from scripts.sync_mplads import main as sync_main
    
    # We will simulate a primary error by mocking persist_all
    # We also mock all intermediate data processing to ensure it reaches persist_all
    with patch("scripts.sync_mplads.persist_all", side_effect=ValueError("PRIMARY_ERROR")), \
         patch("scripts.sync_mplads.write_sync_metadata", side_effect=RuntimeError("METADATA_ERROR")), \
         patch("scripts.sync_mplads.parse_args") as mock_args, \
         patch("scripts.sync_mplads.logger.exception") as mock_logger_exc, \
         patch("scripts.sync_mplads.logger.error") as mock_logger_err, \
         patch("scripts.sync_mplads.settings") as mock_settings, \
         patch("scripts.sync_mplads.EsakshiClient.fetch_one", return_value=[{"dummy": "data"}]), \
         patch("scripts.sync_mplads.transform_all", return_value={}), \
         patch("scripts.sync_mplads.validate_all", return_value=({}, type("MockReport", (), {"total": 0, "data_quality_pct": 100.0})())), \
         patch("scripts.sync_mplads.deduplicate_all", return_value={"allocations": []}), \
         patch("scripts.sync_mplads.extract_mps", return_value=[]), \
         patch("sys.exit") as mock_exit:
             
        # Mock args
        mock_args.return_value.all = True
        mock_args.return_value.dry_run = False
        mock_args.return_value.skip_raw = True
        mock_args.return_value.house = None
        mock_args.return_value.term = None
        
        # Mock settings
        mock_settings.raw_data_path = tmp_path
        mock_settings.validation_data_path = tmp_path
        mock_settings.session_data_dir = str(tmp_path)
        mock_settings.max_retries = 1
        mock_settings.inter_request_delay = 0
        
        # Run sync_main
        sync_main()
        
        # Verify the primary error was logged
        args, _ = mock_logger_exc.call_args
        assert "PRIMARY_ERROR" in str(args[2])
        
        # Verify the metadata error was logged separately
        args, _ = mock_logger_err.call_args
        assert "METADATA_ERROR" in str(args[1])
        
        # Verify it exited with 1
        mock_exit.assert_called_with(1)
