# Product Template Generator Tool

Simple web tool that turns a product template + rotor/pad references into a finished e-commerce composite image.

## Features (v1)

- Upload any base template image
- Choose **One-time use** or **Save as reusable Master Template**
- Upload rotor image + part number
- Enter pad part number (auto-search placeholder) or upload own pad photo
- Generate final image with locked high-quality prompts
- Output filename: `{StoreName}_{RotorPart}_{PadPart}_Final.jpg`

## Quick Start (Local)

```bash
cd product_template_tool
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API at http://localhost:8000 (health: /health). UI: run the Nuxt app, see ../README.md

## Docker (Recommended for server)

```bash
cp .env.example .env
# edit .env if needed
docker compose up -d --build   # run from the repo root, see ../DEPLOY.md
```

Tool available at http://127.0.0.1:3000 (Nginx in front, see ../DEPLOY.md)

## Important: Image Generation Engine

The file `app/services.py` → function `generate_final_image()` currently contains a **placeholder** that simply copies the template.

**You must replace that function** with a call to your real image-generation engine (Grok Imagine, Flux, ComfyUI, Midjourney API, etc.).

The production-ready prompts are already prepared in `app/prompts.py`:

- `ROTOR_SWAP_PROMPT`
- `pad_swap_prompt(part_number)`

## Project Structure

```
product_template_tool/
├── app/
│   ├── main.py          # FastAPI routes
│   ├── models.py        # SQLite models
│   ├── services.py      # Upload + generation logic (plug your AI here)
│   ├── prompts.py       # Locked production prompts
│   └── config.py
├── (UI lives in the Nuxt app at the repo root)
├── uploads/             # templates / rotors / pads / results
├── data/                # SQLite database
├── Dockerfile
└── requirements.txt
```

## Next Steps for Production

1. Implement real image generation inside `generate_final_image()`
2. Connect a real pad image search (Google Custom Search, product catalog, etc.)
3. Add authentication if needed
4. Point a reverse proxy (Nginx / Caddy) to port 8000
5. Define your branding later

## Support

This starter package matches the exact workflow we perfected together (rotor swap → pad swap while preserving all branding).
