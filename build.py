"""
Financialize — Build Script
----------------------------
Builds the React frontend, then packages everything into a single .exe
using PyInstaller.

Prerequisites (run once):
    pip install pyinstaller
    npm install          (in /frontend)

Usage:
    python build.py
"""

import subprocess
import sys
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
BACKEND = ROOT / "backend"
DIST_DIR = ROOT / "release"


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
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        run([sys.executable, "-m", "pip", "install", "pyinstaller"])

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
        sys.executable, "-m", "PyInstaller",
        "--name", "Financialize",
        "--onefile",
        "--console",  # keep console so user can see status; use --noconsole to hide
        "--icon", "NONE",
        # Bundle the entire frontend dist folder
        "--add-data", f"{frontend_dist};frontend/dist",
        # Bundle the backend app package
        "--add-data", f"{BACKEND / 'app'};app",
        # Hidden imports that PyInstaller may miss
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
        "--hidden-import", "sqlalchemy.dialects.sqlite",
        "--hidden-import", "app.main",
        "--hidden-import", "app.database",
        "--hidden-import", "app.models",
        "--hidden-import", "app.schemas",
        "--hidden-import", "app.logic",
        "--hidden-import", "app.routers",
        "--hidden-import", "app.routers_tracker",
        "--hidden-import", "app.routers_scenarios",
        str(BACKEND / "launcher.py"),
    ]

    run(pyinstaller_args, cwd=BACKEND)

    # 4. Copy exe to release folder
    step("Copying to release folder")
    DIST_DIR.mkdir(exist_ok=True)
    exe_src = BACKEND / "dist" / "Financialize.exe"
    exe_dst = DIST_DIR / "Financialize.exe"
    if exe_src.exists():
        shutil.copy2(exe_src, exe_dst)
        print(f"  ✓ {exe_dst}")
    else:
        print("  ERROR: Financialize.exe not found in backend/dist/")
        sys.exit(1)

    # 5. Create a README for end users
    readme = DIST_DIR / "README.txt"
    readme.write_text(
        "Financialize\n"
        "============\n\n"
        "Double-click Financialize.exe to start the app.\n"
        "Your default web browser will open automatically.\n\n"
        "Your data is stored in 'financialize.db' next to the exe.\n"
        "To back up your data, copy that file.\n\n"
        "To quit, close the console window or press Ctrl+C.\n",
        encoding="utf-8",
    )

    step("BUILD COMPLETE")
    print(f"  Output: {DIST_DIR}")
    print(f"  Share the entire 'release' folder with others.")
    print(f"  They just double-click Financialize.exe — no install needed!")


if __name__ == "__main__":
    main()
