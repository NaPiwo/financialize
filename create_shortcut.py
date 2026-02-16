"""
Create a Desktop shortcut for Financialize.
Run this once after building:  python create_shortcut.py

Works on Windows only (uses COM via powershell).
"""

import os
import sys
import subprocess
from pathlib import Path


def create_desktop_shortcut():
    desktop = Path(os.environ.get("USERPROFILE", "~")) / "Desktop"
    desktop = desktop.expanduser()

    # Try to find the exe — first in release/, then in backend/dist/
    root = Path(__file__).resolve().parent
    exe_path = root / "release" / "Financialize.exe"
    if not exe_path.exists():
        exe_path = root / "backend" / "dist" / "Financialize.exe"
    if not exe_path.exists():
        print("ERROR: Financialize.exe not found. Run 'python build.py' first.")
        sys.exit(1)

    shortcut_path = desktop / "Financialize.lnk"

    # Use PowerShell to create a .lnk shortcut (no extra dependencies)
    ps_script = f"""
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("{shortcut_path}")
$shortcut.TargetPath = "{exe_path}"
$shortcut.WorkingDirectory = "{exe_path.parent}"
$shortcut.Description = "Financialize — Personal Finance App"
$shortcut.Save()
"""
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_script],
        capture_output=True, text=True,
    )

    if result.returncode == 0:
        print(f"Desktop shortcut created: {shortcut_path}")
    else:
        print(f"Failed to create shortcut: {result.stderr}")
        sys.exit(1)


if __name__ == "__main__":
    create_desktop_shortcut()
