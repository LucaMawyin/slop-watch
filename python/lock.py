from pathlib import Path
from filelock import FileLock

LOCK_PATH = Path(__file__).resolve().parent.parent / ".slop-watch.lock"

lock = FileLock(LOCK_PATH)