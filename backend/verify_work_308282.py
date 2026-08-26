import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.database import SessionLocal
from models.orm import Work, Expenditure

def run():
    db = SessionLocal()
    work_id = "308282"
    
    print(f"\n--- Investigating work_id: {work_id} ---")
    
    # Check works table (which holds both recommended and completed works)
    works = db.query(Work).filter(Work.work_id == work_id).all()
    print(f"Found {len(works)} records in Work table for this work_id.")
    
    for w in works:
        print(f"\nWork Record (ID: {w.id}):")
        print(f"Status: {w.work_status}")
        print(f"Recommended Amount: {w.recommended_amount}")
        print(f"Final Amount: {w.final_amount}")
        print(f"Completion Date: {w.completion_date}")
        print(f"Recommendation Date: {w.recommendation_date}")
        
    # Check expenditures table
    exps = db.query(Expenditure).filter(Expenditure.work_id == work_id).all()
    print(f"\nFound {len(exps)} records in Expenditure table for this work_id.")
    
    for e in exps:
        print(f"\nExpenditure Record (ID: {e.expenditure_id}):")
        print(f"Amount: {e.expenditure_amount}")
        print(f"Status: {e.payment_status}")
        print(f"Vendor: {e.vendor}")
        print(f"Date: {e.expenditure_date}")

run()
