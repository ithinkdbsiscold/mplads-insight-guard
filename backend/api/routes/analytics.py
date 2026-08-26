"""Analytics routes — GET /api/analytics"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.database import get_db
from models.orm import Work, Expenditure, Allocation

router = APIRouter()


@router.get("", summary="Analytics aggregations")
def analytics(
    db: Session = Depends(get_db),
    house: Optional[str] = Query(None),
    ls_term: Optional[int] = Query(None),
):
    filters = []
    if house:
        filters.append(Work.house == house)
    if ls_term is not None:
        filters.append(Work.ls_term == ls_term)

    # Works by state
    by_state = (
        db.query(Work.state, func.count(Work.id).label("total"))
        .filter(*filters)
        .group_by(Work.state)
        .order_by(func.count(Work.id).desc())
        .limit(15)
        .all()
    )

    # Works by category
    by_category = (
        db.query(Work.work_category, func.count(Work.id).label("total"))
        .filter(*filters)
        .group_by(Work.work_category)
        .order_by(func.count(Work.id).desc())
        .limit(10)
        .all()
    )

    # Works by status
    by_status = (
        db.query(Work.work_status, func.count(Work.id).label("total"))
        .filter(*filters)
        .group_by(Work.work_status)
        .all()
    )

    # Expenditure by payment status
    exp_filters = []
    if house:
        exp_filters.append(Expenditure.house == house)
    if ls_term is not None:
        exp_filters.append(Expenditure.ls_term == ls_term)

    by_payment_status = (
        db.query(
            Expenditure.payment_status,
            func.count(Expenditure.expenditure_id).label("count"),
            func.sum(Expenditure.expenditure_amount).label("total_amount"),
        )
        .filter(*exp_filters)
        .group_by(Expenditure.payment_status)
        .all()
    )

    return {
        "by_state": [{"state": r.state, "total": r.total} for r in by_state],
        "by_category": [{"category": r.work_category, "total": r.total} for r in by_category],
        "by_status": [{"status": r.work_status, "total": r.total} for r in by_status],
        "by_payment_status": [
            {
                "payment_status": r.payment_status,
                "count": r.count,
                "total_amount": r.total_amount,
            }
            for r in by_payment_status
        ],
    }
