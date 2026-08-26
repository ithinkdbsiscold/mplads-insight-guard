"""Expenditure routes — GET /api/expenditures"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.database import get_db
from models.orm import Expenditure

router = APIRouter()


@router.get("", summary="List expenditure records")
def list_expenditures(
    db: Session = Depends(get_db),
    house: Optional[str] = Query(None),
    ls_term: Optional[int] = Query(None),
    state: Optional[str] = Query(None),
    mp_id: Optional[str] = Query(None),
    work_id: Optional[int] = Query(None),
    payment_status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    q = db.query(Expenditure)
    if house:
        q = q.filter(Expenditure.house == house)
    if ls_term is not None:
        q = q.filter(Expenditure.ls_term == ls_term)
    if state:
        q = q.filter(Expenditure.state.ilike(f"%{state}%"))
    if mp_id:
        q = q.filter(Expenditure.mp_id == mp_id)
    if work_id is not None:
        q = q.filter(Expenditure.work_id == work_id)
    if payment_status:
        q = q.filter(Expenditure.payment_status.ilike(f"%{payment_status}%"))

    total = q.count()
    items = (
        q.order_by(Expenditure.expenditure_date.desc())
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
                "expenditure_id": e.expenditure_id,
                "work_id": e.work_id,
                "mp_name": e.mp_name,
                "house": e.house,
                "ls_term": e.ls_term,
                "state": e.state,
                "constituency": e.constituency,
                "vendor": e.vendor,
                "implementing_agency": e.implementing_agency,
                "expenditure_date": e.expenditure_date,
                "payment_status": e.payment_status,
                "expenditure_amount": e.expenditure_amount,
            }
            for e in items
        ],
    }
