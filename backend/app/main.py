from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import APP_NAME, UPLOAD_DIR
from app.models import init_db, AsyncSessionLocal, SavedTemplate, GenerationJob
from app.services import (
    save_upload, search_pad_images, generate_final_image,
    resolve_upload_path, upload_url, UploadTooLarge,
)

# The Nuxt frontend (repo root) is the UI; this app is a JSON API only.
app = FastAPI(title=APP_NAME)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


@app.on_event("startup")
async def startup():
    await init_db()


def _require_image(file: UploadFile, label: str):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, f"{label}: only image files are allowed")


def _save(file: UploadFile, subfolder: str, prefix: str) -> Path:
    try:
        return save_upload(file, subfolder, prefix=prefix)
    except UploadTooLarge as e:
        raise HTTPException(413, str(e))


def _template_out(t: SavedTemplate) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "store_name": t.store_name,
        "path": t.image_path,
        "url": upload_url(Path(t.image_path)),
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@app.get("/api/templates")
async def list_templates(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SavedTemplate)
        .where(SavedTemplate.is_active == True)
        .order_by(SavedTemplate.created_at.desc())
    )
    return [_template_out(t) for t in result.scalars().all()]


@app.delete("/api/templates/{template_id}")
async def archive_template(template_id: int, db: AsyncSession = Depends(get_db)):
    # Soft delete: keeps the file so past jobs still resolve.
    rec = await db.get(SavedTemplate, template_id)
    if not rec or not rec.is_active:
        raise HTTPException(404, "Template not found")
    rec.is_active = False
    await db.commit()
    return {"status": "archived", "template_id": template_id}


@app.post("/api/upload-template")
async def upload_template(
    template: UploadFile = File(...),
    store_name: str = Form(...),
    template_name: str = Form(""),
    save_as_master: str = Form("false"),
    db: AsyncSession = Depends(get_db),
):
    _require_image(template, "Template")

    path = _save(template, "templates", prefix="tpl_")
    is_master = save_as_master.lower() == "true"

    if is_master:
        name = template_name.strip() or f"Template {path.stem}"
        rec = SavedTemplate(name=name, store_name=store_name, image_path=str(path))
        db.add(rec)
        await db.commit()
        await db.refresh(rec)
        return {"status": "saved", "template": _template_out(rec), "path": str(path), "url": upload_url(path)}

    return {"status": "one_time", "path": str(path), "url": upload_url(path)}


@app.post("/api/search-pads")
async def api_search_pads(part_number: str = Form(...)):
    results = await search_pad_images(part_number.strip())
    return {"part_number": part_number, "results": results, "message": "No automatic results yet – please upload your own pad image or connect a search provider."}


@app.post("/api/generate")
async def api_generate(
    store_name: str = Form(...),
    template_path: str = Form(...),
    is_one_time: str = Form("true"),
    rotor_part: str = Form(""),
    pad_part: str = Form(""),
    rotor_image: Optional[UploadFile] = File(None),
    pad_image: Optional[UploadFile] = File(None),
    confirmed_pad_path: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    # Paths come from the client, so they must resolve inside our upload folders.
    tpl = resolve_upload_path(template_path, "templates")
    if not tpl:
        raise HTTPException(400, "Template file not found")

    rotor_path = None
    if rotor_image and rotor_image.filename:
        _require_image(rotor_image, "Rotor image")
        rotor_path = _save(rotor_image, "rotors", prefix="rot_")

    pad_path = None
    if pad_image and pad_image.filename:
        _require_image(pad_image, "Pad image")
        pad_path = _save(pad_image, "pads", prefix="pad_")
    elif confirmed_pad_path:
        pad_path = resolve_upload_path(confirmed_pad_path, "pads")
        if not pad_path:
            raise HTTPException(400, "Confirmed pad image not found")

    if not rotor_path and not pad_path:
        raise HTTPException(400, "Provide a rotor image and/or a pad image")

    # Create job record
    job = GenerationJob(
        store_name=store_name,
        template_path=str(tpl),
        is_one_time=is_one_time.lower() == "true",
        rotor_part=rotor_part or None,
        pad_part=pad_part or None,
        rotor_image_path=str(rotor_path) if rotor_path else None,
        pad_image_path=str(pad_path) if pad_path else None,
        status="processing",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    try:
        final_path = await generate_final_image(
            template_path=tpl,
            rotor_path=rotor_path,
            pad_path=pad_path,
            pad_part=pad_part,
            store_name=store_name,
            rotor_part=rotor_part,
        )
        job.final_image_path = str(final_path)
        job.status = "completed"
        await db.commit()

        return {
            "status": "completed",
            "job_id": job.id,
            "final_url": upload_url(final_path),
            "download_url": f"/download/{final_path.name}",
            "filename": final_path.name,
        }
    except Exception as e:
        job.status = "failed"
        job.notes = str(e)
        await db.commit()
        raise HTTPException(500, f"Generation failed: {e}")


@app.get("/download/{filename}")
async def download_result(filename: str):
    path = resolve_upload_path(filename, "results")
    if not path:
        raise HTTPException(404, "File not found")
    return FileResponse(path, filename=path.name, media_type="image/jpeg")


@app.get("/health")
async def health():
    return {"status": "ok", "app": APP_NAME}
