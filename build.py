"""
Financialize — Build Script
----------------------------
Builds the React frontend, then packages everything into a single
executable using PyInstaller.  Works on both Windows and macOS/Linux.

Prerequisites (run once):
    pip install pyinstaller
    npm install          (in /frontend)

Usage:
    python build.py
"""

import subprocess
import sys
import shutil
import platform
from pathlib import Path

IS_WINDOWS = platform.system() == "Windows"

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
BACKEND = ROOT / "backend"
DIST_DIR = ROOT / "release"

# Use the venv Python so PyInstaller can find fastapi, sqlalchemy, etc.
if IS_WINDOWS:
    VENV_PYTHON = BACKEND / "venv" / "Scripts" / "python.exe"
else:
    VENV_PYTHON = BACKEND / "venv" / "bin" / "python"

if not VENV_PYTHON.exists():
    print(f"ERROR: venv not found at {VENV_PYTHON}")
    if IS_WINDOWS:
        print("Run:  cd backend && python -m venv venv && .\\venv\\Scripts\\Activate && pip install -r requirements.txt")
    else:
        print("Run:  cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt")
    sys.exit(1)

# PyInstaller --add-data uses ; on Windows, : on macOS/Linux
DATA_SEP = ";" if IS_WINDOWS else ":"


def step(msg: str):
    print(f"\n{'='*60}\n  {msg}\n{'='*60}")


def run(cmd: list[str], cwd: Path | None = None):
    print(f"  > {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, shell=True)
    if result.returncode != 0:
        print(f"  ERROR: command failed with code {result.returncode}")
        sys.exit(1)


def main():
    # 1. Build frontend
    step("Building React frontend")
    run(["npm", "install"], cwd=FRONTEND)
    run(["npm", "run", "build"], cwd=FRONTEND)

    frontend_dist = FRONTEND / "dist"
    if not frontend_dist.is_dir():
        print("ERROR: frontend/dist not found after build")
        sys.exit(1)

    # 2. Install PyInstaller if missing
    step("Ensuring PyInstaller is installed")
    run([str(VENV_PYTHON), "-m", "pip", "install", "--quiet", "pyinstaller"])

    # 3. Run PyInstaller
    step("Packaging with PyInstaller")

    # Clean previous build artifacts
    for d in [BACKEND / "build", BACKEND / "dist"]:
        if d.exists():
            shutil.rmtree(d)
    spec_file = BACKEND / "Financialize.spec"
    if spec_file.exists():
        spec_file.unlink()

    pyinstaller_args = [
        str(VENV_PYTHON), "-m", "PyInstaller",
        "--name", "Financialize",
        "--onefile",
        "--console",  # keep console so user can see status; use --noconsole to hide
        "--icon", "NONE",
        # Bundle the entire frontend dist folder as data
        "--add-data", f"{frontend_dist}{DATA_SEP}frontend/dist",
        # --- Uvicorn internals (not auto-detected) ---
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "uvicorn.lifespan.off",
        # --- FastAPI / Starlette ---
        "--hidden-import", "fastapi",
        "--hidden-import", "fastapi.routing",
        "--hidden-import", "fastapi.middleware",
        "--hidden-import", "fastapi.middleware.cors",
        "--hidden-import", "starlette",
        "--hidden-import", "starlette.routing",
        "--hidden-import", "starlette.middleware",
        "--hidden-import", "starlette.middleware.cors",
        "--hidden-import", "starlette.responses",
        "--hidden-import", "starlette.staticfiles",
        "--hidden-import", "starlette.templating",
        "--hidden-import", "anyio._backends._asyncio",
        # --- Pydantic ---
        "--hidden-import", "pydantic",
        "--hidden-import", "pydantic.deprecated.decorator",
        # --- SQLAlchemy ---
        "--hidden-import", "sqlalchemy",
        "--hidden-import", "sqlalchemy.dialects.sqlite",
        # --- Data libs ---
        "--hidden-import", "numpy",
        "--hidden-import", "pandas",
        # --- App modules (traced via direct import, but be explicit) ---
        "--hidden-import", "app.main",
        "--hidden-import", "app.database",
        "--hidden-import", "app.models",
        "--hidden-import", "app.schemas",
        "--hidden-import", "app.logic",
        "--hidden-import", "app.routers",
        "--hidden-import", "app.routers_tracker",
        "--hidden-import", "app.routers_scenarios",
        # --- Collect all submodules for packages PyInstaller struggles with ---
        "--collect-submodules", "uvicorn",
        "--collect-submodules", "fastapi",
        "--collect-submodules", "starlette",
        "--collect-submodules", "pydantic",
        str(BACKEND / "launcher.py"),
    ]

    run(pyinstaller_args, cwd=BACKEND)

    # 4. Copy binary to release folder
    step("Copying to release folder")
    DIST_DIR.mkdir(exist_ok=True)
    bin_name = "Financialize.exe" if IS_WINDOWS else "Financialize"
    bin_src = BACKEND / "dist" / bin_name
    bin_dst = DIST_DIR / bin_name
    if bin_src.exists():
        shutil.copy2(bin_src, bin_dst)
        print(f"  \u2713 {bin_dst}")
    else:
        print(f"  ERROR: {bin_name} not found in backend/dist/")
        sys.exit(1)

    # 5. Create a README for end users
    readme = DIST_DIR / "README.txt"
    if IS_WINDOWS:
        launch_instruction = "Double-click Financialize.exe to start the app."
    else:
        launch_instruction = (
            "Open a terminal in this folder and run:\n"
            "  chmod +x Financialize   (first time only)\n"
            "  ./Financialize"
        )
    if IS_WINDOWS:
        security_note = (
            "SECURITY NOTE:\n"
            "Windows may show a 'Windows protected your PC' warning.\n"
            "This is normal for unsigned apps. Click 'More info' then 'Run anyway'.\n"
        )
    else:
        security_note = (
            "SECURITY NOTE:\n"
            "macOS may block the app ('unidentified developer').\n"
            "Right-click the file -> Open -> click 'Open' in the dialog.\n"
            "You only need to do this once.\n"
        )
    readme.write_text(
        "Financialize\n"
        "============\n\n"
        f"{launch_instruction}\n"
        "Your default web browser will open automatically.\n\n"
        f"{security_note}\n"
        "Your data is stored in 'financialize.db' next to the app.\n"
        "To back up your data, copy that file.\n\n"
        "To quit, close the terminal window or press Ctrl+C.\n",
        encoding="utf-8",
    )

    step("BUILD COMPLETE")
    print(f"  Output: {DIST_DIR}")
    print(f"  Share the entire 'release' folder with others.")
    print(f"  They just run {bin_name} — no install needed!")


if __name__ == "__main__":
    main()
