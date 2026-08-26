"""Health check routes."""
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone
from models.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", summary="Health check")
def health(response: Response, db: Session = Depends(get_db)):
    db_status = "connected"
    overall_status = "healthy"
    
    try:
        # Simple test query
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check database ping failed: {e}")
        db_status = "unavailable"
        overall_status = "degraded"
        response.status_code = 503

    return {
        "status": overall_status,
        "database": db_status,
        "service": "mplads-guardian-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
