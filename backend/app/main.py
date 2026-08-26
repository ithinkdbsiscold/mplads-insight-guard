"""
MPLADS Guardian — FastAPI Application Entry Point
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from models.database import create_all_tables
from api.routes import mps, projects, expenditures, alerts, analytics, dashboard, health

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before serving requests."""
    logger.info("Starting MPLADS Guardian API...")
    create_all_tables()
    logger.info("Database tables ready")
    yield
    logger.info("Shutting down MPLADS Guardian API")


app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description=(
        "MPLADS Guardian — Investigation-support platform for "
        "Member of Parliament Local Area Development Scheme monitoring."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────────────
PREFIX = settings.api_v1_prefix

app.include_router(health.router,       prefix=PREFIX,            tags=["Health"])
app.include_router(mps.router,          prefix=f"{PREFIX}/mps",   tags=["MPs"])
app.include_router(projects.router,     prefix=f"{PREFIX}/projects", tags=["Projects"])
app.include_router(expenditures.router, prefix=f"{PREFIX}/expenditures", tags=["Expenditures"])
app.include_router(alerts.router,       prefix=f"{PREFIX}/alerts", tags=["Alerts"])
app.include_router(analytics.router,    prefix=f"{PREFIX}/analytics", tags=["Analytics"])
app.include_router(dashboard.router,    prefix=f"{PREFIX}/dashboard", tags=["Dashboard"])
