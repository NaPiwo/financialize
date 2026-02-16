
import sys
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .database import engine, Base
from . import models # Ensure models are registered
from .routers import router as api_router
from .routers_tracker import router as tracker_router
from .routers_scenarios import router as scenarios_router

# Create DB Tables
Base.metadata.create_all(bind=engine)

# Lightweight migration: add missing columns to existing tables
with engine.connect() as conn:
    from sqlalchemy import text, inspect
    inspector = inspect(engine)
    if "scenarios" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("scenarios")]
        if "data" not in columns:
            conn.execute(text("ALTER TABLE scenarios ADD COLUMN data TEXT"))
            conn.commit()
    if "accounts" in inspector.get_table_names():
        acc_cols = [col["name"] for col in inspector.get_columns("accounts")]
        for col_name, col_type in [("subtype", "TEXT"), ("description", "TEXT"), ("target_balance", "REAL"), ("currency", "TEXT"), ("person_id", "INTEGER")]:
            if col_name not in acc_cols:
                conn.execute(text(f"ALTER TABLE accounts ADD COLUMN {col_name} {col_type}"))
                conn.commit()

app = FastAPI()

# Allow CORS for local development
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:*",
    "http://127.0.0.1:*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
def read_status():
    return {"status": "ok", "message": "Backend is online"}

# Include API Routes
app.include_router(api_router, prefix="/api")
app.include_router(tracker_router, prefix="/api")
app.include_router(scenarios_router, prefix="/api")

# --- Serve built frontend in production (PyInstaller bundle) ---
def _get_static_dir() -> Path | None:
    """Locate the built frontend dist folder."""
    if getattr(sys, "frozen", False):
        # PyInstaller bundles data into _MEIPASS (onedir) or temp dir (onefile)
        base = Path(sys._MEIPASS)  # type: ignore[attr-defined]
    else:
        base = Path(__file__).resolve().parent.parent.parent  # repo root
    dist = base / "frontend" / "dist"
    if dist.is_dir():
        return dist
    return None

_static = _get_static_dir()
if _static:
    # Serve static assets (JS, CSS, images) under /assets
    app.mount("/assets", StaticFiles(directory=str(_static / "assets")), name="static-assets")

    # Catch-all: serve index.html for any non-API route (SPA client-side routing)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = _static / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(_static / "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Hello from Python Finance Brain"}
