"""
Financialize Launcher
---------------------
Entry point for the packaged application.
Finds a free port, starts the FastAPI server, and opens the default browser.
"""

import sys
import os
import socket
import webbrowser
import threading
import uvicorn


def find_free_port(start: int = 8000, end: int = 8100) -> int:
    """Find an available TCP port in the given range."""
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError(f"No free port found in range {start}-{end}")


def open_browser(port: int, delay: float = 1.5):
    """Open the default browser after a short delay to let the server start."""
    import time
    time.sleep(delay)
    webbrowser.open(f"http://localhost:{port}")


def main():
    port = find_free_port()
    print(f"Starting Financialize on http://localhost:{port}")

    # Open browser in a background thread
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    # Start the server (this blocks until shutdown)
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        log_level="warning",
    )


if __name__ == "__main__":
    main()
