"""
MPLADS Guardian — Application Configuration

All settings are loaded from environment variables (via .env file in local dev).
Never hardcode credentials. See .env.example for the full list.
"""

from __future__ import annotations

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database ─────────────────────────────────────────────────────────────
    # SQLite for local dev; switch to PostgreSQL URL in production
    database_url: str = "sqlite:///./data/guardian.db"

    # ── API ──────────────────────────────────────────────────────────────────
    api_v1_prefix: str = "/api/v1"
    project_name:  str = "MPLADS Guardian"
    version:       str = "0.1.0"
    debug:         bool = False

    # ── CORS ─────────────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins, e.g. "http://localhost:5173,https://myapp.vercel.app"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # ── Ingestion ────────────────────────────────────────────────────────────
    raw_data_dir:        str = "./data/raw"
    validation_data_dir: str = "./data/validation"
    session_data_dir:    str = "./data"
    default_ls_term:     str = "both"       # "17" | "18" | "both"
    inter_request_delay: float = 1.0         # seconds between API calls
    request_timeout:     int   = 120         # seconds per API request
    max_retries:         int   = 3           # API request retries

    # ── Logging ──────────────────────────────────────────────────────────────
    log_level: str = "INFO"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def raw_data_path(self) -> Path:
        return Path(self.raw_data_dir)

    @property
    def validation_data_path(self) -> Path:
        return Path(self.validation_data_dir)


settings = Settings()
