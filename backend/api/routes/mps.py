"""MP routes — GET /api/mps, GET /api/mps/states, and GET /api/mps/{mp_id}"""
from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case, distinct

from models.database import get_db
from models.orm import MP, Work, Expenditure, Allocation

router = APIRouter()

def get_mp_summary(db: Session, mp: MP, house: Optional[str] = None, ls_term: Optional[int] = None) -> dict:
    # 1. Allocation
    alloc_q = db.query(func.sum(Allocation.allocated_amount)).filter(Allocation.mp_id == mp.mp_id)
    if house: alloc_q = alloc_q.filter(Allocation.house == house)
    if ls_term is not None: alloc_q = alloc_q.filter(Allocation.ls_term == ls_term)
    allocated = alloc_q.scalar()
    allocated = float(allocated) if allocated is not None else 0.0
    
    alloc_count_q = db.query(func.count(Allocation.allocation_id)).filter(Allocation.mp_id == mp.mp_id)
    if house: alloc_count_q = alloc_count_q.filter(Allocation.house == house)
    if ls_term is not None: alloc_count_q = alloc_count_q.filter(Allocation.ls_term == ls_term)
    has_allocation = alloc_count_q.scalar() > 0

    # 2. Expenditure
    exp_q = db.query(func.sum(Expenditure.expenditure_amount)).filter(Expenditure.mp_id == mp.mp_id)
    if house: exp_q = exp_q.filter(Expenditure.house == house)
    if ls_term is not None: exp_q = exp_q.filter(Expenditure.ls_term == ls_term)
    expenditure = exp_q.scalar()
    expenditure = float(expenditure) if expenditure is not None else 0.0

    # Utilization
    if has_allocation and allocated > 0:
        utilization = round((expenditure / allocated) * 100, 2)
    else:
        utilization = None

    # 3. Works and Project Values
    works_q = db.query(Work.work_status, func.count(Work.id), func.sum(Work.recommended_amount), func.sum(Work.final_amount)).filter(Work.mp_id == mp.mp_id)
    if house: works_q = works_q.filter(Work.house == house)
    if ls_term is not None: works_q = works_q.filter(Work.ls_term == ls_term)
    works_q = works_q.group_by(Work.work_status)
    
    works_recommended = 0
    works_completed = 0
    recommended_project_value = 0.0
    completed_project_value = 0.0

    for row in works_q.all():
        status, count, rec_amt, fin_amt = row
        if status == "Recommended":
            works_recommended = count or 0
            recommended_project_value = float(rec_amt) if rec_amt else 0.0
        elif status == "Completed":
            works_completed = count or 0
            completed_project_value = float(fin_amt) if fin_amt else 0.0
            
    total_works = works_completed + works_recommended
    if total_works > 0:
        completion_rate = round((works_completed / total_works) * 100, 2)
    else:
        completion_rate = 0.0

    return {
        "mp_id": mp.mp_id,
        "name": mp.name,
        "house": mp.house,
        "state": mp.state,
        "constituency": mp.constituency,
        "stats": {
            "allocated_amount": allocated if has_allocation else None,
            "total_expenditure": expenditure,
            "utilization_pct": utilization,
            "works_recommended": works_recommended,
            "works_completed": works_completed,
            "total_works": total_works,
            "completion_rate_pct": completion_rate,
            "recommended_project_value": recommended_project_value,
            "completed_project_value": completed_project_value,
        }
    }


@router.get("/states", summary="Get unique MP states for filters")
def get_mp_states(
    db: Session = Depends(get_db),
    house: Optional[str] = Query(None),
    ls_term: Optional[int] = Query(None),
):
    q = db.query(MP.state).distinct().filter(MP.state != None, MP.state != "")
    if house:
        q = q.filter(MP.house == house)
    if ls_term is not None:
        q = q.join(Allocation).filter(Allocation.ls_term == ls_term)
        
    states = [r[0] for r in q.order_by(MP.state).all()]
    return {"states": states}


@router.get("", summary="List MPs")
def list_mps(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search name, constituency, state"),
    house: Optional[str] = Query(None, description="'Lok Sabha' or 'Rajya Sabha'"),
    ls_term: Optional[int] = Query(None),
    state: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    # Base query for MPs
    q = db.query(MP)
    if search:
        pattern = f"%{search}%"
        q = q.filter(
            or_(
                MP.name.ilike(pattern),
                MP.constituency.ilike(pattern),
                MP.state.ilike(pattern),
            )
        )
    if house:
        q = q.filter(MP.house == house)
    if state:
        q = q.filter(MP.state.ilike(f"%{state}%"))
    if ls_term is not None:
        q = q.join(Allocation).filter(Allocation.ls_term == ls_term)

    total = q.count()
    items = q.order_by(MP.name).offset((page - 1) * page_size).limit(page_size).all()

    # Get mp_ids for the current page
    mp_ids = [m.mp_id for m in items]
    
    if not mp_ids:
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": (total + page_size - 1) // page_size,
            "items": [],
        }

    # Fetch aggregated stats for these specific MPs in bulk
    
    # Allocations
    alloc_q = db.query(
        Allocation.mp_id, 
        func.sum(Allocation.allocated_amount).label('amt'),
        func.count(Allocation.allocation_id).label('cnt')
    ).filter(Allocation.mp_id.in_(mp_ids))
    if house: alloc_q = alloc_q.filter(Allocation.house == house)
    if ls_term is not None: alloc_q = alloc_q.filter(Allocation.ls_term == ls_term)
    alloc_map = {row[0]: (float(row[1] or 0.0), row[2] > 0) for row in alloc_q.group_by(Allocation.mp_id).all()}

    # Expenditures
    exp_q = db.query(
        Expenditure.mp_id, 
        func.sum(Expenditure.expenditure_amount).label('amt')
    ).filter(Expenditure.mp_id.in_(mp_ids))
    if house: exp_q = exp_q.filter(Expenditure.house == house)
    if ls_term is not None: exp_q = exp_q.filter(Expenditure.ls_term == ls_term)
    exp_map = {row[0]: float(row[1] or 0.0) for row in exp_q.group_by(Expenditure.mp_id).all()}

    # Works
    works_q = db.query(
        Work.mp_id,
        func.sum(case((Work.work_status == "Recommended", 1), else_=0)).label("w_rec"),
        func.sum(case((Work.work_status == "Completed", 1), else_=0)).label("w_comp")
    ).filter(Work.mp_id.in_(mp_ids))
    if house: works_q = works_q.filter(Work.house == house)
    if ls_term is not None: works_q = works_q.filter(Work.ls_term == ls_term)
    works_map = {row[0]: (int(row[1] or 0), int(row[2] or 0)) for row in works_q.group_by(Work.mp_id).all()}

    results = []
    for mp in items:
        # Build the exact same dictionary structure as get_mp_summary
        allocated, has_allocation = alloc_map.get(mp.mp_id, (0.0, False))
        expenditure = exp_map.get(mp.mp_id, 0.0)
        
        utilization = None
        if has_allocation and allocated > 0:
            utilization = round((expenditure / allocated) * 100, 2)
            
        w_rec, w_comp = works_map.get(mp.mp_id, (0, 0))
        total_works = w_rec + w_comp
        completion_rate = round((w_comp / total_works) * 100, 2) if total_works > 0 else 0.0
        
        results.append({
            "mp_id": mp.mp_id,
            "name": mp.name,
            "house": mp.house,
            "state": mp.state,
            "constituency": mp.constituency,
            "stats": {
                "allocated_amount": allocated if has_allocation else None,
                "total_expenditure": expenditure,
                "utilization_pct": utilization,
                "works_recommended": w_rec,
                "works_completed": w_comp,
                "total_works": total_works,
                "completion_rate_pct": completion_rate,
                "recommended_project_value": 0.0, # Not strictly needed on index view
                "completed_project_value": 0.0,   # Not strictly needed on index view
            }
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
        "items": results,
    }


@router.get("/{mp_id}", summary="Get MP details")
def get_mp(
    mp_id: str, 
    db: Session = Depends(get_db),
    house: Optional[str] = Query(None),
    ls_term: Optional[int] = Query(None)
):
    mp = db.query(MP).filter(MP.mp_id == mp_id).first()
    if not mp:
        raise HTTPException(status_code=404, detail="MP not found")

    mp_data = get_mp_summary(db, mp, house=house, ls_term=ls_term)
    
    works_q = db.query(Work).filter(Work.mp_id == mp_id)
    if house: works_q = works_q.filter(Work.house == house)
    if ls_term is not None: works_q = works_q.filter(Work.ls_term == ls_term)
    projects = works_q.order_by(Work.work_id.desc()).limit(100).all()
    
    return {
        "mp": {
            "mp_id": mp.mp_id,
            "name": mp.name,
            "house": mp.house,
            "state": mp.state,
            "constituency": mp.constituency,
            "memberStatus": "" # Backend lacks reliable status data. Left explicit string.
        },
        "stats": mp_data["stats"],
        "projects": [
            {
                "id": p.id,
                "work_id": p.work_id,
                "mp_id": p.mp_id,
                "mp_name": p.mp_name,
                "house": p.house,
                "ls_term": p.ls_term,
                "state": p.state,
                "constituency": p.constituency,
                "work_category": p.work_category,
                "work_description": p.work_description,
                "implementing_agency": p.implementing_agency,
                "recommendation_date": p.recommendation_date,
                "recommended_amount": p.recommended_amount,
                "completion_date": p.completion_date,
                "final_amount": p.final_amount,
                "work_status": p.work_status,
            }
            for p in projects
        ]
    }
