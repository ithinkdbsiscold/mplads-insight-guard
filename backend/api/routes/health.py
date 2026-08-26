"""Health check routes."""
from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()


@router.get("/health", summary="Health check")
def health():
    return {
        "status": "ok",
        "service": "mplads-guardian-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
