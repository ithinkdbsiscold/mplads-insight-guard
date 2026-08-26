"""Projects (Works) routes — GET /api/projects and GET /api/projects/{project_id}"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from models.database import get_db
from models.orm import Work

router = APIRouter()


def _work_dict(w: Work) -> dict:
    return {
        "id": w.id,
        "work_id": w.work_id,
        "mp_id": w.mp_id,
        "mp_name": w.mp_name,
        "house": w.house,
        "ls_term": w.ls_term,
        "state": w.state,
        "constituency": w.constituency,
        "work_category": w.work_category,
        "work_description": w.work_description,
        "implementing_agency": w.implementing_agency,
        "recommendation_date": w.recommendation_date,
        "recommended_amount": w.recommended_amount,
        "completion_date": w.completion_date,
        "final_amount": w.final_amount,
        "work_status": w.work_status,
        "has_image": w.has_image,
        "average_rating": w.average_rating,
    }


@router.get("", summary="List works/projects")
def list_projects(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Full-text search on description"),
    house: Optional[str] = Query(None),
    ls_term: Optional[int] = Query(None),
    state: Optional[str] = Query(None),
    constituency: Optional[str] = Query(None),
    mp_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="'Completed' or 'Recommended'"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    q = db.query(Work)
    if search:
        q = q.filter(Work.work_description.ilike(f"%{search}%"))
    if house:
        q = q.filter(Work.house == house)
    if ls_term is not None:
        q = q.filter(Work.ls_term == ls_term)
    if state:
        q = q.filter(Work.state.ilike(f"%{state}%"))
    if constituency:
        q = q.filter(Work.constituency.ilike(f"%{constituency}%"))
    if mp_id:
        q = q.filter(Work.mp_id == mp_id)
    if category:
        q = q.filter(Work.work_category.ilike(f"%{category}%"))
    if status:
        q = q.filter(Work.work_status == status)

    total = q.count()
    items = (
        q.order_by(Work.recommendation_date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": [_work_dict(w) for w in items],
    }


@router.get("/{project_id}", summary="Get project details")
def get_project(project_id: int, db: Session = Depends(get_db)):
    w = db.query(Work).filter(Work.id == project_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Project not found")
    return _work_dict(w)


@router.get("/{project_id}/analysis", summary="Get agent findings for a project")
def get_project_analysis(project_id: int, db: Session = Depends(get_db)):
    w = db.query(Work).filter(Work.id == project_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Project not found")
    findings = [
        {
            "finding_id": f.finding_id,
            "agent_name": f.agent_name,
            "finding_type": f.finding_type,
            "severity": f.severity,
            "score": f.score,
            "explanation": f.explanation,
            "confidence": f.confidence,
            "reviewed": f.reviewed,
        }
        for f in w.findings
    ]
    return {"project_id": project_id, "work_id": w.work_id, "findings": findings}


@router.get("/{project_id}/expenditures", summary="Get expenditures for a project")
def get_project_expenditures(project_id: int, db: Session = Depends(get_db)):
    w = db.query(Work).filter(Work.id == project_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Project not found")
    exps = [
        {
            "expenditure_id": e.expenditure_id,
            "vendor": e.vendor,
            "implementing_agency": e.implementing_agency,
            "expenditure_date": e.expenditure_date,
            "payment_status": e.payment_status,
            "expenditure_amount": e.expenditure_amount,
        }
        for e in w.expenditures
    ]
    return {"project_id": project_id, "work_id": w.work_id, "expenditures": exps}
