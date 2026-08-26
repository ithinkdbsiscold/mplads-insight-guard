import sys
import os
from sqlalchemy import func

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.database import SessionLocal
from models.orm import Work, Expenditure

def run():
    db = SessionLocal()
    
    print("\n--- Looking for a project with multiple expenditures ---")
    exp_work = db.query(Work.work_id).join(Expenditure, Work.work_id == Expenditure.work_id).group_by(Work.work_id).having(func.count(Expenditure.expenditure_id) > 1).first()
    if exp_work:
        w_id = exp_work[0]
        print(f"Found Work ID with multiple expenditures: {w_id}")
        w = db.query(Work).filter(Work.work_id == w_id).first()
        print(f"Status: {w.work_status}")
        exps = db.query(Expenditure).filter(Expenditure.work_id == w_id).all()
        print(f"Found {len(exps)} expenditures")
        for e in exps:
            print(f"  {e.expenditure_amount} | {e.payment_status} | {e.expenditure_date}")

run()
