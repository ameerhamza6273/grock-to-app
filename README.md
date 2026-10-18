# Product Template Generator

Brake rotor/pad product-image tool: upload a branded template, swap in rotor + pad images,
get `{StoreName}_{RotorPart}_{PadPart}_Final.jpg`. Branding/layout stays unchanged.

```
app/        Nuxt 3 frontend (SPA, the UI)
backend/    FastAPI JSON API + SQLite (originally built via Grok)
```

Nuxt proxies `/api`, `/uploads` and `/download` to the backend (`BACKEND_URL`,
default `http://localhost:8000`), so the browser only talks to one origin.

## Local development

```bash
# backend (Python 3.11+)
cd backend
python -m venv venv && venv\Scripts\activate   # Linux/mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# frontend (separate terminal, repo root)
npm install
npm run dev            # http://localhost:3000
```

## Production build

```bash
BACKEND_URL=http://backend:8000 npm run build   # BACKEND_URL is baked in at build time
node .output/server/index.mjs                   # PORT=3000 by default
```

## Status

- Image generation: `backend/app/services.py` → `generate_final_image()` is still a
  placeholder (re-saves the template as JPEG). Image API not chosen yet.
- Pad auto-search: `search_pad_images()` returns no results yet; the UI already supports
  showing results for confirmation once it does (`local_path` per result).
