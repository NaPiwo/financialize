
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker


def _get_data_dir() -> str:
    """Return a writable directory for the SQLite database.
    - PyInstaller onefile: next to the .exe
    - Normal dev: current working directory
    """
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(".")


DATA_DIR = _get_data_dir()
DB_PATH = os.path.join(DATA_DIR, "financialize.db")
SQLITE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLITE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
