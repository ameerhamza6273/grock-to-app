import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", BASE_DIR / "uploads"))
DATA_DIR = BASE_DIR / "data"

for d in [
    UPLOAD_DIR / "templates",
    UPLOAD_DIR / "rotors",
    UPLOAD_DIR / "pads",
    UPLOAD_DIR / "results",
    DATA_DIR,
]:
    d.mkdir(parents=True, exist_ok=True)

APP_NAME = os.getenv("APP_NAME", "Product Template Generator")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DATA_DIR}/tool.db")
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "20"))
IMAGE_GEN_API_URL = os.getenv("IMAGE_GEN_API_URL", "")
IMAGE_GEN_API_KEY = os.getenv("IMAGE_GEN_API_KEY", "")
