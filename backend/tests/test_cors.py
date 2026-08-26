from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_cors_preflight_vercel():
    response = client.options(
        "/api/v1/dashboard/summary?house=Lok%20Sabha&ls_term=18",
        headers={
            "Origin": "https://mplads-insight-guard.vercel.app",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == "https://mplads-insight-guard.vercel.app"
    assert "GET" in response.headers.get("Access-Control-Allow-Methods", "")

def test_cors_preflight_localhost():
    response = client.options(
        "/api/v1/dashboard/summary",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"

def test_cors_preflight_rejected_origin():
    response = client.options(
        "/api/v1/dashboard/summary",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET",
        }
    )
    assert response.status_code == 400
    assert response.text == "Disallowed CORS origin"
    # The allow-origin header should NOT be present for unconfigured origins
    assert "Access-Control-Allow-Origin" not in response.headers

def test_real_api_request():
    response = client.get(
        "/api/v1/dashboard/summary?house=Lok%20Sabha&ls_term=18",
        headers={
            "Origin": "https://mplads-insight-guard.vercel.app",
        }
    )
    assert response.status_code == 200
    assert response.headers.get("Access-Control-Allow-Origin") == "https://mplads-insight-guard.vercel.app"
    data = response.json()
    assert "kpis" in data
