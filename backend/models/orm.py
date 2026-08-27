"""
MPLADS Guardian — SQLAlchemy ORM Models

Schema designed for MPLADS Guardian — not copied from Empowered Indian.

Entity relationships:
  MP ─── ALLOCATION    (one MP, one allocation per house/term)
  MP ─── WORK          (one MP, many works)
  WORK ─ EXPENDITURE   (one work, many payment events)
  WORK ─ AGENT_FINDING (one work, many findings)

Key design decisions:
  - mp_id is a deterministic sha256-based hex string (see deduplication.py)
  - work_id is the source WORK_RECOMMENDATION_DTL_ID integer
  - ls_term is NULL for Rajya Sabha, 17/18 for Lok Sabha
  - Every table stores house + ls_term for independent querying
  - Every table stores provenance (fetched_at, source_combo, source_key)
  - created_at / updated_at use server-side defaults for consistency
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    ForeignKeyConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# MP
# ---------------------------------------------------------------------------

class MP(Base):
    """
    Member of Parliament entity.

    mp_id is a deterministic 16-char hex derived from:
      sha256(lower(name) + "|" + house + "|" + lower(constituency))

    This makes the ID stable across runs even if the database is wiped.
    """
    __tablename__ = "mps"
    __table_args__ = (
        Index("ix_mp_house_state", "house", "state"),
    )

    mp_id        = Column(String(16), primary_key=True)
    name         = Column(String(255), nullable=False, index=True)
    house        = Column(String(20),  nullable=False, index=True)
    state        = Column(String(100), nullable=False, index=True)
    constituency = Column(String(255))
    # ls_term is stored separately on allocations/works; here it is NULL
    # because the same MP may appear across multiple terms
    entity_key   = Column(String(512), nullable=False, unique=True)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    allocations  = relationship("Allocation",  back_populates="mp", lazy="select")
    works        = relationship("Work",        back_populates="mp", lazy="select")
    expenditures = relationship("Expenditure", back_populates="mp", lazy="select")

    def __repr__(self) -> str:
        return f"<MP {self.mp_id} {self.name!r} {self.house}>"


# ---------------------------------------------------------------------------
# Allocation
# ---------------------------------------------------------------------------

class Allocation(Base):
    """
    Annual/term allocation for one MP.

    Unique constraint: (house, ls_term, mp_name, constituency)
    """
    __tablename__ = "allocations"
    __table_args__ = (
        UniqueConstraint("house", "ls_term", "mp_name", "constituency",
                         name="uq_allocation_scope"),
        Index("ix_alloc_house_term", "house", "ls_term"),
        Index("ix_alloc_mp_house_term", "mp_id", "house", "ls_term"),
    )

    allocation_id    = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    mp_id            = Column(String(16), ForeignKey("mps.mp_id"), nullable=True, index=True)
    mp_name          = Column(String(255), nullable=False, index=True)
    house            = Column(String(20),  nullable=False, index=True)
    ls_term          = Column(Integer,     nullable=True,  index=True)
    state            = Column(String(100), nullable=False, index=True)
    constituency     = Column(String(255))
    allocated_amount = Column(Float,       nullable=False, default=0.0)
    sr_no            = Column(Integer)
    # provenance
    fetched_at   = Column(String(30), nullable=False)
    source_combo = Column(String(30), nullable=False)
    source_key   = Column(String(100), nullable=False)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    mp = relationship("MP", back_populates="allocations")

    def __repr__(self) -> str:
        return f"<Allocation {self.mp_name} {self.house} ls={self.ls_term} ₹{self.allocated_amount}>"


# ---------------------------------------------------------------------------
# Work
# ---------------------------------------------------------------------------

class Work(Base):
    """
    A single MPLADS work project.

    work_id is the source WORK_RECOMMENDATION_DTL_ID (integer).
    The uniqueness constraint is (house, ls_term, state, work_id).

    A work can be:
      - recommended only (completion_date is NULL)
      - completed        (completion_date is set)

    work_status is derived during normalisation:
      "Recommended" | "Completed"
    """
    __tablename__ = "works"
    __table_args__ = (
        UniqueConstraint("house", "ls_term", "state", "work_id",
                         name="uq_work_scope"),
        Index("ix_work_house_term", "house", "ls_term"),
        Index("ix_work_house_term_state", "house", "ls_term", "state"),
        Index("ix_work_mp_house_term", "mp_id", "house", "ls_term"),
    )

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    work_id             = Column(Integer,  nullable=False, index=True)
    mp_id               = Column(String(16), ForeignKey("mps.mp_id"), nullable=True, index=True)
    mp_name             = Column(String(255), nullable=False, index=True)
    house               = Column(String(20),  nullable=False, index=True)
    ls_term             = Column(Integer,     nullable=True,  index=True)
    state               = Column(String(100), nullable=False, index=True)
    constituency        = Column(String(255), index=True)
    work_category       = Column(String(255))
    work_description    = Column(Text)
    implementing_agency = Column(String(255))
    recommendation_date = Column(String(10))   # YYYY-MM-DD
    recommended_amount  = Column(Float,  default=0.0)
    completion_date     = Column(String(10))   # YYYY-MM-DD; NULL if not completed
    final_amount        = Column(Float,  default=0.0)
    work_status         = Column(String(20),  nullable=False, default="Recommended", index=True)
    has_image           = Column(Boolean, default=False)
    average_rating      = Column(Float)
    # provenance
    fetched_at   = Column(String(30), nullable=False)
    source_combo = Column(String(30), nullable=False)
    source_key   = Column(String(100), nullable=False)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())

    mp           = relationship("MP",          back_populates="works")
    expenditures = relationship("Expenditure", back_populates="work", lazy="select")
    findings     = relationship("AgentFinding", back_populates="work", lazy="select",
                                primaryjoin="Work.work_id == AgentFinding.work_id",
                                foreign_keys="[AgentFinding.work_id]")

    def __repr__(self) -> str:
        return f"<Work {self.work_id} {self.house} ls={self.ls_term} status={self.work_status}>"


# ---------------------------------------------------------------------------
# Expenditure
# ---------------------------------------------------------------------------

class Expenditure(Base):
    """
    Individual expenditure / payment event on a work.

    Multiple expenditure records can belong to one work_id (multiple payment events).
    Do NOT aggregate — individual records are needed by the Payment Pattern Agent.
    """
    __tablename__ = "expenditures"
    __table_args__ = (
        ForeignKeyConstraint(
            ["house", "ls_term", "state", "work_id"],
            ["works.house", "works.ls_term", "works.state", "works.work_id"],
            name="fk_expenditure_work"
        ),
        Index("ix_exp_house_term", "house", "ls_term"),
        Index("ix_exp_house_term_state", "house", "ls_term", "state"),
        Index("ix_exp_mp_house_term", "mp_id", "house", "ls_term"),
        Index("ix_exp_work_id", "work_id"),
    )

    expenditure_id      = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    work_id             = Column(Integer, nullable=True, index=True)
    mp_id               = Column(String(16), ForeignKey("mps.mp_id"), nullable=True, index=True)
    mp_name             = Column(String(255), nullable=False, index=True)
    house               = Column(String(20),  nullable=False, index=True)
    ls_term             = Column(Integer,     nullable=True,  index=True)
    state               = Column(String(100), nullable=False, index=True)
    constituency        = Column(String(255))
    work_description    = Column(Text)
    vendor              = Column(String(255))
    implementing_agency = Column(String(255))
    expenditure_date    = Column(String(10))   # YYYY-MM-DD
    payment_status      = Column(String(100),  index=True)
    expenditure_amount  = Column(Float,        nullable=False, default=0.0)
    # provenance
    fetched_at   = Column(String(30), nullable=False)
    source_combo = Column(String(30), nullable=False)
    source_key   = Column(String(100), nullable=False)
    created_at   = Column(DateTime, server_default=func.now())

    mp   = relationship("MP",   back_populates="expenditures")
    work = relationship("Work", back_populates="expenditures")

    def __repr__(self) -> str:
        return f"<Expenditure {self.work_id} {self.payment_status} ₹{self.expenditure_amount}>"


# ---------------------------------------------------------------------------
# AgentFinding (stub for future agents)
# ---------------------------------------------------------------------------

class AgentFinding(Base):
    """
    A finding generated by a detection agent.

    The system NEVER asserts that a finding proves wrongdoing.
    Severity levels are investigation-support indicators only.

    Stub model — agents will be implemented in a later phase.
    """
    __tablename__ = "agent_findings"

    finding_id    = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    work_id       = Column(Integer, nullable=True, index=True)
    mp_id         = Column(String(16), ForeignKey("mps.mp_id"), nullable=True, index=True)
    agent_name    = Column(String(100),  nullable=False, index=True)
    finding_type  = Column(String(100),  nullable=False)
    # Severity: "low" | "medium" | "high" | "critical"
    severity      = Column(String(20),   nullable=False, index=True)
    score         = Column(Float)          # 0.0–1.0 explainable score
    explanation   = Column(Text)           # Human-readable explanation
    evidence      = Column(Text)           # JSON-serialised supporting data
    confidence    = Column(Float)          # 0.0–1.0
    # Resolution tracking
    reviewed      = Column(Boolean, default=False)
    review_notes  = Column(Text)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())

    work = relationship("Work", back_populates="findings",
                        primaryjoin="AgentFinding.work_id == Work.work_id",
                        foreign_keys="[AgentFinding.work_id]")

    def __repr__(self) -> str:
        return f"<AgentFinding {self.agent_name} sev={self.severity} work={self.work_id}>"


# ---------------------------------------------------------------------------
# SyncMetadata
# ---------------------------------------------------------------------------

class SyncMetadata(Base):
    """
    Tracks each ingestion run — powers the "Data last updated: ..." display.
    """
    __tablename__ = "sync_metadata"

    id                  = Column(Integer, primary_key=True, autoincrement=True)
    house               = Column(String(20), index=True)
    ls_term             = Column(Integer, nullable=True)
    source              = Column(String(100), default="eSAKSHI")
    last_sync           = Column(DateTime)
    records_fetched     = Column(Integer, default=0)
    records_inserted    = Column(Integer, default=0)
    records_updated     = Column(Integer, default=0)
    records_skipped     = Column(Integer, default=0)
    records_failed      = Column(Integer, default=0)
    sync_duration_secs  = Column(Float,   default=0.0)
    data_quality_pct    = Column(Float,   default=100.0)
    status              = Column(String(20), default="success")
    error_message       = Column(Text)
    failed_datasets     = Column(Text)
    created_at          = Column(DateTime, server_default=func.now())

    def __repr__(self) -> str:
        return f"<SyncMetadata {self.house} ls={self.ls_term} {self.last_sync}>"
