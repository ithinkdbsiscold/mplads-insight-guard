import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.database import SessionLocal
from models.orm import MP, Work, Expenditure

def run():
    db = SessionLocal()
    
    print("\n--- Specific MPs ---")
    specific_mps = db.query(MP).filter(MP.name.ilike("%Tharoor%")).all()
    for m in specific_mps:
        print(f"{m.name} | {m.house} | {m.state}")

run()
