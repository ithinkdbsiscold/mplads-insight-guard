"""Alerts routes — GET /api/alerts (backed by AgentFinding table)"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.orm import AgentFinding

router = APIRouter()


@router.get("", summary="List agent findings / alerts")
def list_alerts(
    db: Session = Depends(get_db),
    severity: Optional[str] = Query(None, description="low | medium | high | critical"),
    agent: Optional[str] = Query(None),
    reviewed: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    q = db.query(AgentFinding)
    if severity:
        q = q.filter(AgentFinding.severity == severity)
    if agent:
        q = q.filter(AgentFinding.agent_name == agent)
    if reviewed is not None:
        q = q.filter(AgentFinding.reviewed == reviewed)

    total = q.count()
    items = (
        q.order_by(AgentFinding.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "finding_id": f.finding_id,
                "work_id": f.work_id,
                "mp_id": f.mp_id,
                "agent_name": f.agent_name,
                "finding_type": f.finding_type,
                "severity": f.severity,
                "score": f.score,
                "explanation": f.explanation,
                "confidence": f.confidence,
                "reviewed": f.reviewed,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in items
        ],
    }
