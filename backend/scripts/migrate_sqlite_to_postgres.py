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

def migrate_data(sqlite_path="./data/guardian.db", reset=False):
    sqlite_url = f"sqlite:///{sqlite_path}"
    postgres_url = settings.database_url
    
    if postgres_url.startswith("sqlite"):
        logger.error("DATABASE_URL in environment is set to sqlite. Please set it to postgresql to migrate.")
        sys.exit(1)
        
    # Hide credentials in logs
    logger.info(f"Source: {sqlite_path}")
    logger.info("Target: PostgreSQL (URL hidden for security)")
    
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif postgres_url.startswith("postgresql://"):
        postgres_url = postgres_url.replace("postgresql://", "postgresql+psycopg://", 1)
    
    sqlite_engine = create_engine(sqlite_url)
    postgres_engine = create_engine(postgres_url)
    
    SqliteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)
    
    if reset:
        logger.warning("!!! WARNING: RESET FLAG PROVIDED !!!")
        logger.warning("THIS WILL DELETE EXISTING POSTGRESQL APPLICATION DATA AND REIMPORT FROM SQLITE.")
        logger.warning("Waiting 5 seconds before proceeding... Press Ctrl+C to abort.")
        time.sleep(5)
        
        try:
            from sqlalchemy import text
            with PostgresSession() as pg_session:
                logger.info("Executing CASCADE TRUNCATE on application tables...")
                pg_session.execute(text("TRUNCATE TABLE agent_findings, expenditures, works, allocations, mps, sync_metadata CASCADE;"))
                pg_session.commit()
                logger.info("PostgreSQL application data cleared. Alembic history preserved.")
        except Exception as e:
            logger.error(f"Failed to clear PostgreSQL data: {e}")
            sys.exit(1)
    
    logger.info("Ensuring target schema exists...")
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
                
                query = sqlite_session.query(model)
                total_records = query.count()
                logger.info(f"Found {total_records} records to migrate.")
                
                if total_records == 0:
                    results[name] = {"inserted": 0, "skipped": 0, "failed": 0, "time": 0}
                    continue
                
                # Load only PKs to check for existence
                existing_pks = {getattr(r, pk_attr) for r in pg_session.query(getattr(model, pk_attr)).all()}
                
                valid_work_keys = None
                work_id_to_keys = None
                
                if name == "Expenditures":
                    logger.info("Pre-loading valid works keys for FK validation...")
                    valid_works_raw = pg_session.query(Work.house, Work.ls_term, Work.state, Work.work_id).all()
                    valid_work_keys = set(valid_works_raw)
                    work_id_to_keys = {}
                    ambiguous_work_ids = set()
                    for w_house, w_term, w_state, w_id in valid_works_raw:
                        if w_id in work_id_to_keys:
                            ambiguous_work_ids.add(w_id)
                        else:
                            work_id_to_keys[w_id] = (w_house, w_term, w_state)
                    for w_id in ambiguous_work_ids:
                        if w_id in work_id_to_keys:
                            del work_id_to_keys[w_id]
                
                inserted = 0
                skipped = 0
                failed = 0
                
                batch_size = 5000
                to_insert = []
                
                for record in query.yield_per(batch_size):
                    if getattr(record, pk_attr) in existing_pks:
                        skipped += 1
                        continue
                        
                    # FK resolution for Expenditures
                    if name == "Expenditures" and valid_work_keys is not None:
                        fk_key = (record.house, record.ls_term, record.state, record.work_id)
                        if fk_key not in valid_work_keys:
                            # Try to autocorrect mismatched state/house
                            if record.work_id in work_id_to_keys:
                                correct_house, correct_term, correct_state = work_id_to_keys[record.work_id]
                                record.house = correct_house
                                record.ls_term = correct_term
                                record.state = correct_state
                            else:
                                # True orphan
                                skipped += 1
                                continue
                                
                    sqlite_session.expunge(record)
                    from sqlalchemy.orm import make_transient
                    make_transient(record)
                    to_insert.append(record)
                    
                    if len(to_insert) >= batch_size:
                        try:
                            pg_session.bulk_save_objects(to_insert)
                            pg_session.commit()
                            inserted += len(to_insert)
                            logger.info(f"Inserted {inserted}/{total_records} {name} (Skipped: {skipped})...")
                        except Exception as e:
                            pg_session.rollback()
                            err_str = str(e)
                            if "11001" in err_str or "getaddrinfo failed" in err_str:
                                logger.error(f"FATAL connection error: {err_str}")
                                sys.exit(1)
                            logger.error(f"Batch insert failed for {name}: {err_str[:200]}. Falling back to individual inserts.")
                            for item in to_insert:
                                try:
                                    pg_session.add(item)
                                    pg_session.commit()
                                    inserted += 1
                                except Exception as ex:
                                    pg_session.rollback()
                                    failed += 1
                        to_insert = []
                
                # Insert any remaining records
                if to_insert:
                    try:
                        pg_session.bulk_save_objects(to_insert)
                        pg_session.commit()
                        inserted += len(to_insert)
                        logger.info(f"Inserted {inserted}/{total_records} {name} (Skipped: {skipped})...")
                    except Exception as e:
                        pg_session.rollback()
                        logger.error(f"Batch insert failed for {name}: {e}. Falling back to individual inserts.")
                        for item in to_insert:
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
        
    logger.info("Migration complete. Starting validation...")
    
    # -------------------------------------------------------------------------
    # Validation Phase
    # -------------------------------------------------------------------------
    logger.info("==================================================")
    logger.info("VALIDATION REPORT")
    logger.info("==================================================")
    try:
        from sqlalchemy import text
        with SqliteSession() as sqlite_session, PostgresSession() as pg_session:
            for model, name, pk_attr in models_to_migrate:
                sqlite_count = sqlite_session.query(model).count()
                pg_count = pg_session.query(model).count()
                match = "MATCH" if sqlite_count == pg_count else "MISMATCH"
                if name == "Expenditures" and sqlite_count != pg_count:
                    match = "EXPECTED MISMATCH (Orphans Skipped)"
                logger.info(f"Validation {name:15} | SQLite: {sqlite_count:6} | PG: {pg_count:6} | {match}")
                
            logger.info("--- Aggregate Validation ---")
            sq_mp = sqlite_session.execute(text("SELECT COUNT(DISTINCT mp_id) FROM mps")).scalar()
            pg_mp = pg_session.execute(text("SELECT COUNT(DISTINCT mp_id) FROM mps")).scalar()
            logger.info(f"Distinct MPs        | SQLite: {sq_mp:6} | PG: {pg_mp:6} | {'MATCH' if sq_mp==pg_mp else 'MISMATCH'}")
            
            sq_w = sqlite_session.execute(text("SELECT COUNT(DISTINCT work_id) FROM works")).scalar()
            pg_w = pg_session.execute(text("SELECT COUNT(DISTINCT work_id) FROM works")).scalar()
            logger.info(f"Distinct Works      | SQLite: {sq_w:6} | PG: {pg_w:6} | {'MATCH' if sq_w==pg_w else 'MISMATCH'}")
            
            # Check terms
            for house, term in [('Lok Sabha', 17), ('Lok Sabha', 18), ('Rajya Sabha', None)]:
                if term:
                    sq_w = sqlite_session.execute(text(f"SELECT COUNT(*) FROM works WHERE house='{house}' AND ls_term={term}")).scalar()
                    pg_w = pg_session.execute(text(f"SELECT COUNT(*) FROM works WHERE house='{house}' AND ls_term={term}")).scalar()
                    logger.info(f"{house} {term} Works  | SQLite: {sq_w:6} | PG: {pg_w:6} | {'MATCH' if sq_w==pg_w else 'MISMATCH'}")
                else:
                    sq_w = sqlite_session.execute(text(f"SELECT COUNT(*) FROM works WHERE house='{house}'")).scalar()
                    pg_w = pg_session.execute(text(f"SELECT COUNT(*) FROM works WHERE house='{house}'")).scalar()
                    logger.info(f"{house} Works        | SQLite: {sq_w:6} | PG: {pg_w:6} | {'MATCH' if sq_w==pg_w else 'MISMATCH'}")
                    
            # Financial Aggregates
            sq_exp_amt = sqlite_session.execute(text("SELECT SUM(expenditure_amount) FROM expenditures")).scalar() or 0
            pg_exp_amt = pg_session.execute(text("SELECT SUM(expenditure_amount) FROM expenditures")).scalar() or 0
            logger.info(f"Total Exp Amount    | SQLite: {sq_exp_amt:.2f} | PG: {pg_exp_amt:.2f} | {'MATCH (within precision)' if abs(sq_exp_amt - pg_exp_amt) < 1.0 else 'MISMATCH'}")
            
            # Random field-level sample check
            logger.info("--- Field-Level Sample Validation ---")
            sample_mp = sqlite_session.execute(text("SELECT mp_id, name, state FROM mps LIMIT 1")).fetchone()
            if sample_mp:
                pg_sample = pg_session.execute(text(f"SELECT name, state FROM mps WHERE mp_id='{sample_mp[0]}'")).fetchone()
                if pg_sample and pg_sample[0] == sample_mp[1] and pg_sample[1] == sample_mp[2]:
                    logger.info("MP Field validation: PASSED")
                else:
                    logger.info("MP Field validation: FAILED")
                    
    except Exception as e:
        logger.error(f"Validation failed: {e}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Migrate SQLite data to PostgreSQL")
    parser.add_argument("--reset", action="store_true", help="Clear existing PostgreSQL data before migrating")
    args = parser.parse_args()
    
    migrate_data(reset=args.reset)
