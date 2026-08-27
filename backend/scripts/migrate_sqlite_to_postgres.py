import os
import sys
import logging
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

from models.orm import Base, MP, Allocation, Work, Expenditure, AgentFinding, SyncMetadata
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def migrate_data():
    sqlite_url = "sqlite:///./data/guardian.db"
    postgres_url = settings.database_url
    
    if postgres_url.startswith("sqlite"):
        logger.error("DATABASE_URL in environment is set to sqlite. Please set it to postgresql to migrate.")
        sys.exit(1)
        
    logger.info(f"Source: {sqlite_url}")
    logger.info(f"Target: {postgres_url}")
    
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif postgres_url.startswith("postgresql://"):
        postgres_url = postgres_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    sqlite_engine = create_engine(sqlite_url)
    postgres_engine = create_engine(postgres_url)
    
    SqliteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)
    
    # Ensure target schema exists
    logger.info("Ensuring target schema exists (using Alembic is recommended, but doing fallback ensure)...")
    Base.metadata.create_all(bind=postgres_engine)
    
    models_to_migrate = [
        (MP, "MPs", "mp_id"),
        (Allocation, "Allocations", "allocation_id"),
        (Work, "Works", "id"),
        (Expenditure, "Expenditures", "expenditure_id"),
        (AgentFinding, "AgentFindings", "finding_id"),
        (SyncMetadata, "SyncMetadata", "id")
    ]
    
    total_start = time.time()
    results = {}
    
    try:
        with SqliteSession() as sqlite_session, PostgresSession() as pg_session:
            for model, name, pk_attr in models_to_migrate:
                logger.info(f"--- Migrating {name} ---")
                start_time = time.time()
                
                # Fetch all records from sqlite
                records = sqlite_session.query(model).all()
                total_records = len(records)
                logger.info(f"Found {total_records} records to migrate.")
                
                if total_records == 0:
                    results[name] = {"inserted": 0, "skipped": 0, "failed": 0, "time": 0}
                    continue
                
                # Check existing records in PG to avoid duplication
                existing_pks = {getattr(r, pk_attr) for r in pg_session.query(getattr(model, pk_attr)).all()}
                
                to_insert = []
                skipped = 0
                for record in records:
                    if getattr(record, pk_attr) in existing_pks:
                        skipped += 1
                        continue
                        
                    # Detach from sqlite session
                    sqlite_session.expunge(record)
                    # For SQLAlchemy to insert it freshly
                    from sqlalchemy.orm import make_transient
                    make_transient(record)
                    to_insert.append(record)
                
                inserted = 0
                failed = 0
                batch_size = 5000
                
                for i in range(0, len(to_insert), batch_size):
                    batch = to_insert[i:i + batch_size]
                    try:
                        pg_session.bulk_save_objects(batch)
                        pg_session.commit()
                        inserted += len(batch)
                        logger.info(f"Inserted {inserted}/{len(to_insert)} {name}...")
                    except Exception as e:
                        pg_session.rollback()
                        logger.error(f"Batch insert failed for {name}: {e}")
                        # Fallback to individual inserts
                        for item in batch:
                            try:
                                pg_session.add(item)
                                pg_session.commit()
                                inserted += 1
                            except Exception as ex:
                                pg_session.rollback()
                                failed += 1
                                
                duration = time.time() - start_time
                logger.info(f"Completed {name}: {inserted} inserted, {skipped} skipped, {failed} failed in {duration:.2f}s")
                results[name] = {"inserted": inserted, "skipped": skipped, "failed": failed, "time": duration}
                
    except Exception as e:
        logger.error(f"Migration aborted due to error: {e}")
        sys.exit(1)
        
    total_duration = time.time() - total_start
    logger.info("==================================================")
    logger.info(f"MIGRATION SUMMARY (Total time: {total_duration:.2f}s)")
    logger.info("==================================================")
    for name, r in results.items():
        logger.info(f"{name:15} | Inserted: {r['inserted']:6} | Skipped: {r['skipped']:6} | Failed: {r['failed']:6} | Time: {r['time']:.2f}s")
        
    logger.info("Migration complete.")

if __name__ == "__main__":
    migrate_data()
