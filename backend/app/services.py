"""
Core services for the Product Template Generator.
Image generation is abstracted so you can plug any engine later.
"""

import uuid
from pathlib import Path
from typing import Optional, List, Dict
from PIL import Image
from app.config import UPLOAD_DIR, MAX_UPLOAD_SIZE_MB
from app.prompts import ROTOR_SWAP_PROMPT, pad_swap_prompt


ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


class UploadTooLarge(Exception):
    pass


def save_upload(file, subfolder: str, prefix: str = "") -> Path:
    """Save an uploaded file and return its path. Enforces MAX_UPLOAD_SIZE_MB."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTS:
        ext = ".jpg"
    filename = f"{prefix}{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / subfolder / filename
    limit = MAX_UPLOAD_SIZE_MB * 1024 * 1024
    written = 0
    with open(dest, "wb") as f:
        while chunk := file.file.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                f.close()
                dest.unlink(missing_ok=True)
                raise UploadTooLarge(f"File is larger than {MAX_UPLOAD_SIZE_MB} MB")
            f.write(chunk)
    return dest


def resolve_upload_path(value: str, subfolder: str) -> Optional[Path]:
    """
    Map a client-supplied path or filename to a file inside UPLOAD_DIR/subfolder.
    Only the basename is used, so "../" tricks or absolute paths can never escape it.
    """
    name = Path(value.replace("\\", "/")).name
    if not name:
        return None
    path = UPLOAD_DIR / subfolder / name
    return path if path.is_file() else None


def upload_url(path: Path) -> str:
    """Public URL for a file under UPLOAD_DIR (served by the /uploads mount)."""
    rel = Path(path).resolve().relative_to(UPLOAD_DIR.resolve())
    return "/uploads/" + rel.as_posix()


def make_final_filename(store_name: str, rotor_part: str, pad_part: str) -> str:
    """
    Naming convention: {StoreName}_{RotorPart}_{PadPart}_Final.jpg
    """
    store = "".join(c for c in store_name if c.isalnum() or c in ("-", "_")).strip() or "Store"
    # Part numbers keep letters/digits only, e.g. DF_63326007R -> DF63326007R (per spec)
    rotor = "".join(c for c in (rotor_part or "") if c.isalnum()) or "ROTOR"
    pad = "".join(c for c in (pad_part or "") if c.isalnum()) or "PAD"
    return f"{store}_{rotor}_{pad}_Final.jpg"


async def search_pad_images(part_number: str) -> List[Dict]:
    """
    Placeholder for automatic pad image search.
    In production: call Google/Bing/your catalog API or scrape trusted sites.
    Returns list of {url, title, local_path?} for the user to confirm.
    """
    # TODO: Replace with real search (web_search, product catalog, etc.)
    # For now return empty so the UI forces confirmation / own upload
    return [
        # Example structure when implemented:
        # {"id": "1", "title": f"Brembo {part_number} official", "url": "https://...", "thumbnail": "..."}
    ]


async def generate_final_image(
    template_path: Path,
    rotor_path: Optional[Path] = None,
    pad_path: Optional[Path] = None,
    pad_part: str = "",
    store_name: str = "Store",
    rotor_part: str = "",
) -> Path:
    """
    Main generation entry point.
    
    CURRENT STATUS: Placeholder that copies the template and adds a note.
    Replace the body of this function with your real image-generation call
    (Grok Imagine, Flux, Midjourney API, ComfyUI, etc.).
    
    The prompts are already prepared in app/prompts.py.
    """
    final_name = make_final_filename(store_name, rotor_part, pad_part)
    result_path = UPLOAD_DIR / "results" / final_name

    # --- PLACEHOLDER IMPLEMENTATION ---
    # In production replace everything below with a real multi-step generation:
    # 1. Call image-to-image / reference-to-image with ROTOR_SWAP_PROMPT if rotor_path
    # 2. Then call again with pad_swap_prompt(pad_part) if pad_path
    # 3. Save the final result

    # For now we just re-save the template as JPEG so the full pipeline is testable.
    # convert("RGB") so PNG/WebP templates (with alpha) still produce a real .jpg.
    with Image.open(template_path) as img:
        # Keep original size – do not degrade
        img.convert("RGB").save(result_path, "JPEG", quality=95)

    return result_path


def get_prompt_for_rotor() -> str:
    return ROTOR_SWAP_PROMPT


def get_prompt_for_pad(part_number: str) -> str:
    return pad_swap_prompt(part_number)
