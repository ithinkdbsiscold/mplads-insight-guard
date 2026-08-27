"""Health check routes."""
from fastapi import APIRouter, Depends, Response, UploadFile, File, BackgroundTasks
import shutil
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

@router.get("/db_verify", summary="Verify database schema and row counts")
def db_verify(db: Session = Depends(get_db)):
    tables_result = db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")).scalars().all()
    
    required = ["mps", "allocations", "works", "expenditures", "agent_findings", "sync_metadata"]
    
    regclass_results = {}
    row_counts = {}
    
    for tbl in required:
        try:
            reg = db.execute(text(f"SELECT to_regclass('public.{tbl}')")).scalar()
            regclass_results[tbl] = str(reg)
        except Exception as e:
            regclass_results[tbl] = f"Error: {e}"
            
        try:
            cnt = db.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            row_counts[tbl] = cnt
        except Exception as e:
            row_counts[tbl] = 0
            
    return {
        "tables": tables_result,
        "regclass": regclass_results,
        "row_counts": row_counts
    }

@router.post("/db_migrate_upload", summary="Upload sqlite db and migrate")
def db_migrate_upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    tmp_path = "/tmp/guardian.db"
    # Ensure /tmp exists (Render might not have it if using certain OSes, but usually does. Better use python's tempfile if /tmp is risky, but Render has /tmp)
    import os
    os.makedirs("/tmp", exist_ok=True)
    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    def run_migration():
        try:
            logger.info("Starting background data migration...")
            # We import here to avoid circular imports if any
            from scripts.migrate_sqlite_to_postgres import migrate_data
            migrate_data(sqlite_path=tmp_path)
            logger.info("Background data migration complete.")
        except Exception as e:
            logger.error(f"Background migration failed: {e}")
            
    background_tasks.add_task(run_migration)
    return {"status": "migration_started"}
