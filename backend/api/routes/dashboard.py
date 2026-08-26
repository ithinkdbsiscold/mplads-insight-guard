"""Dashboard summary route — GET /api/dashboard/summary"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from models.database import get_db
from models.orm import MP, Work, Expenditure, Allocation, SyncMetadata

router = APIRouter()


@router.get("/summary", summary="Dashboard KPI summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    house: Optional[str] = Query(None),
    ls_term: Optional[int] = Query(None),
    state: Optional[str] = Query(None),
):
    # Base Filters
    def apply_filters(q, model):
        if house:
            q = q.filter(model.house == house)
        if ls_term is not None:
            if hasattr(model, 'ls_term'):
                q = q.filter(model.ls_term == ls_term)
        if state:
            if hasattr(model, 'state'):
                q = q.filter(model.state == state)
        return q

    # 1. KPIs
    mp_q = db.query(func.count(func.distinct(MP.mp_id)))
    if house: mp_q = mp_q.filter(MP.house == house)
    if state: mp_q = mp_q.filter(MP.state == state)
    if ls_term is not None: mp_q = mp_q.join(Allocation).filter(Allocation.ls_term == ls_term)
    total_mps = mp_q.scalar() or 0

    alloc_q = db.query(func.sum(Allocation.allocated_amount))
    alloc_q = apply_filters(alloc_q, Allocation)
    total_allocated = alloc_q.scalar() or 0.0

    exp_q = db.query(func.sum(Expenditure.expenditure_amount))
    exp_q = apply_filters(exp_q, Expenditure)
    total_expenditure = exp_q.scalar() or 0.0

    util_pct = round((total_expenditure / total_allocated * 100) if total_allocated > 0 else 0, 2)

    work_base = db.query(Work.work_status, func.count(Work.id))
    work_base = apply_filters(work_base, Work)
    work_base = work_base.group_by(Work.work_status).all()

    completed_works = 0
    recommended_works = 0
    for status, count in work_base:
        if status == "Completed":
            completed_works = count
        elif status == "Recommended":
            recommended_works = count

    total_works = completed_works + recommended_works
    completion_rate = round((completed_works / total_works * 100) if total_works > 0 else 0, 2)

    # 2. Work Categories
    cat_q = db.query(Work.work_category, func.count(Work.id))
    cat_q = apply_filters(cat_q, Work)
    categories = cat_q.group_by(Work.work_category).order_by(desc(func.count(Work.id))).limit(10).all()
    work_categories = [{"category": c[0] or "Unknown", "count": c[1]} for c in categories]

    # 3. State Overview
    # We aggregate works, allocations, expenditures per state and zip them
    state_works_q = db.query(Work.state, Work.work_status, func.count(Work.id))
    state_works_q = apply_filters(state_works_q, Work).group_by(Work.state, Work.work_status).all()

    state_alloc_q = db.query(Allocation.state, func.sum(Allocation.allocated_amount))
    state_alloc_q = apply_filters(state_alloc_q, Allocation).group_by(Allocation.state).all()

    state_exp_q = db.query(Expenditure.state, func.sum(Expenditure.expenditure_amount))
    state_exp_q = apply_filters(state_exp_q, Expenditure).group_by(Expenditure.state).all()

    state_mps_q = db.query(MP.state, func.count(func.distinct(MP.mp_id)))
    if house: state_mps_q = state_mps_q.filter(MP.house == house)
    if state: state_mps_q = state_mps_q.filter(MP.state == state)
    if ls_term is not None: state_mps_q = state_mps_q.join(Allocation).filter(Allocation.ls_term == ls_term)
    state_mps_q = state_mps_q.group_by(MP.state).all()

    state_map = {}
    for state, mps_count in state_mps_q:
        if state not in state_map:
            state_map[state] = {"state": state, "mps": mps_count, "works": 0, "completed": 0, "remaining": 0, "funds": 0.0, "spent": 0.0}
        else:
            state_map[state]["mps"] = mps_count

    for state, status, count in state_works_q:
        if state not in state_map:
            state_map[state] = {"state": state, "mps": 0, "works": 0, "completed": 0, "remaining": 0, "funds": 0.0, "spent": 0.0}
        state_map[state]["works"] += count
        if status == "Completed":
            state_map[state]["completed"] += count
        elif status == "Recommended":
            state_map[state]["remaining"] += count

    for state, alloc in state_alloc_q:
        if state in state_map:
            state_map[state]["funds"] = float(alloc or 0.0)
            
    for state, exp in state_exp_q:
        if state in state_map:
            state_map[state]["spent"] = float(exp or 0.0)

    state_overview = []
    for s_data in state_map.values():
        u = round((s_data["spent"] / s_data["funds"] * 100) if s_data["funds"] > 0 else 0, 2)
        s_data["utilization"] = u
        state_overview.append(s_data)
    state_overview.sort(key=lambda x: x["spent"], reverse=True)

    # 4. Expenditure Trend (Monthly)
    trend_q = db.query(func.substr(Expenditure.expenditure_date, 1, 7).label('month'), func.sum(Expenditure.expenditure_amount))
    trend_q = apply_filters(trend_q, Expenditure)
    trend_q = trend_q.filter(Expenditure.expenditure_date != None, Expenditure.expenditure_date != "")
    trend_q = trend_q.group_by('month').order_by('month').all()
    expenditure_trend = [{"month": row[0], "amount": float(row[1] or 0.0)} for row in trend_q if row[0]]

    # 5. Payment Status
    ps_q = db.query(Expenditure.payment_status, func.count(Expenditure.expenditure_id), func.sum(Expenditure.expenditure_amount))
    ps_q = apply_filters(ps_q, Expenditure)
    ps_q = ps_q.group_by(Expenditure.payment_status).all()
    payment_status = [{"status": row[0] or "Unknown", "count": row[1], "amount": float(row[2] or 0.0)} for row in ps_q]

    # 6. Top Vendors
    vend_q = db.query(Expenditure.vendor, func.sum(Expenditure.expenditure_amount))
    vend_q = apply_filters(vend_q, Expenditure)
    vend_q = vend_q.filter(Expenditure.vendor != None, Expenditure.vendor != "", Expenditure.vendor != " ")
    vend_q = vend_q.group_by(Expenditure.vendor).order_by(desc(func.sum(Expenditure.expenditure_amount))).limit(10).all()
    top_vendors = [{"vendor": row[0], "amount": float(row[1] or 0.0)} for row in vend_q]

    # 7. Top MPs by Expenditure
    top_mps_q = db.query(Expenditure.mp_name, Expenditure.mp_id, func.sum(Expenditure.expenditure_amount))
    top_mps_q = apply_filters(top_mps_q, Expenditure)
    top_mps_q = top_mps_q.group_by(Expenditure.mp_name, Expenditure.mp_id).order_by(desc(func.sum(Expenditure.expenditure_amount))).limit(10).all()
    top_mps = [{"mp_name": row[0], "mp_id": row[1], "amount": float(row[2] or 0.0)} for row in top_mps_q]

    # 8. Recent Activity
    recent_works_q = db.query(Work).filter(Work.recommendation_date != None)
    recent_works_q = apply_filters(recent_works_q, Work)
    recent_works = recent_works_q.order_by(desc(Work.recommendation_date)).limit(5).all()
    
    recent_activity = [
        {
            "id": w.id,
            "project": w.work_description,
            "mp_name": w.mp_name,
            "mp_id": w.mp_id,
            "state": w.state,
            "amount": float(w.recommended_amount or 0.0),
            "status": w.work_status,
            "date": w.recommendation_date,
            "type": "work"
        }
        for w in recent_works
    ]

    # Sync status
    last_sync_q = db.query(SyncMetadata)
    if house:
        last_sync_q = last_sync_q.filter(SyncMetadata.house == house)
    if ls_term is not None:
        last_sync_q = last_sync_q.filter(SyncMetadata.ls_term == ls_term)
    last_sync = last_sync_q.order_by(SyncMetadata.last_sync.desc()).first()

    return {
        "kpis": {
            "total_mps": total_mps,
            "total_works": total_works,
            "completed_works": completed_works,
            "recommended_works": recommended_works,
            "completion_rate_pct": completion_rate,
            "total_allocated": total_allocated,
            "total_expenditure": total_expenditure,
            "utilization_pct": util_pct,
        },
        "work_categories": work_categories,
        "state_overview": state_overview,
        "expenditure_trend": expenditure_trend,
        "payment_status": payment_status,
        "top_vendors": top_vendors,
        "top_mps": top_mps,
        "recent_activity": recent_activity,
        "last_sync": {
            "timestamp": last_sync.last_sync.isoformat() if last_sync and last_sync.last_sync else None,
            "house": last_sync.house if last_sync else None,
            "status": last_sync.status if last_sync else None,
        },
    }
