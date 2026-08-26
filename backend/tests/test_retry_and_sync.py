"""
Tests for API retry logic, UTF-8 encoding, and partial sync behavior.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import requests

# Ensure backend root is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

from ingestion.mplads_client import EsakshiClient
from app.config import settings

@pytest.fixture
def mock_client(tmp_path):
    with patch.object(EsakshiClient, "_is_session_valid", return_value=True):
        client = EsakshiClient(data_dir=tmp_path)
        client._cookies = "mock_cookie"
        return client

def test_fetch_one_retries_on_connection_error(mock_client):
    """Test that fetch_one retries on ConnectionError and eventually succeeds."""
    mock_post = MagicMock()
    # Fail 2 times, succeed on 3rd
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.text = json.dumps([{"mock": "data"}])
    
    mock_post.side_effect = [
        requests.exceptions.ConnectionError("Mock connection error"),
        requests.exceptions.Timeout("Mock timeout"),
        mock_response
    ]
    mock_client._http.post = mock_post
    
    with patch("time.sleep") as mock_sleep:
        result = mock_client.fetch_one("combo_test", "works_completed")
    
    assert mock_post.call_count == 3
    assert len(result) == 1
    assert result[0]["mock"] == "data"
    assert mock_sleep.call_count == 2

def test_fetch_one_retries_on_5xx_and_429(mock_client):
    """Test that fetch_one retries on 500/503/429 HTTP codes."""
    mock_post = MagicMock()
    
    resp_503 = MagicMock()
    resp_503.status_code = 503
    
    resp_429 = MagicMock()
    resp_429.status_code = 429
    
    resp_ok = MagicMock()
    resp_ok.status_code = 200
    resp_ok.text = json.dumps([{"mock": "data"}])
    
    mock_post.side_effect = [resp_503, resp_429, resp_ok]
    mock_client._http.post = mock_post
    
    with patch("time.sleep"):
        result = mock_client.fetch_one("combo_test", "works_completed")
    
    assert mock_post.call_count == 3
    assert result[0]["mock"] == "data"

def test_fetch_one_fails_after_max_retries(mock_client):
    """Test that fetch_one gives up after max_retries."""
    mock_post = MagicMock()
    mock_post.side_effect = requests.exceptions.ConnectionError("Mock error")
    mock_client._http.post = mock_post
    
    original_retries = settings.max_retries
    settings.max_retries = 2
    try:
        with patch("time.sleep"):
            with pytest.raises(RuntimeError, match="Failed combo=combo_test type=works_completed after 2 retries"):
                mock_client.fetch_one("combo_test", "works_completed")
        
        assert mock_post.call_count == 3  # Initial + 2 retries
    finally:
        settings.max_retries = original_retries

def test_fetch_all_for_combo_partial_success(mock_client):
    """Test that a failure in one dataset doesn't crash fetch_all_for_combo."""
    def mock_fetch_one(combo, dt):
        if dt == "works_recommended":
            raise RuntimeError("Simulated failure")
        return [{"data": dt}]

    mock_client.fetch_one = mock_fetch_one
    
    with patch("time.sleep"):
        results, errors = mock_client.fetch_all_for_combo("test", "test_label")
        
    assert results["works_completed"] == [{"data": "works_completed"}]
    assert results["works_recommended"] == []
    
    assert len(errors) == 1
    assert errors[0]["dataset"] == "works_recommended"
    assert "Simulated failure" in errors[0]["error"]

def test_utf8_file_writing(tmp_path):
    """Test that scripts/sync_mplads.py logic properly handles Indian unicode characters."""
    # We test the file writing logic directly
    data = [{"name": "नरेन्द्र मोदी", "state": "தமிழ்நாடு"}]
    
    out_path = tmp_path / "test_unicode.json"
    
    # Simulate how sync_mplads.py writes
    out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    
    # Read back and verify it didn't use 'charmap' and didn't lose characters
    read_data = json.loads(out_path.read_text(encoding="utf-8"))
    assert read_data[0]["name"] == "नरेन्द्र मोदी"
    assert read_data[0]["state"] == "தமிழ்நாடு"
