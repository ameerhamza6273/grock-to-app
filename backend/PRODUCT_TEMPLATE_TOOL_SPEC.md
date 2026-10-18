# Product Template Generator Tool
## Technical Specification v1.0 (Ready for Development)

**Status:** Locked for v1  
**Date:** 2026-10-10  
**Owner:** [Your Company – TBD]

---

## 1. Vision

A simple web tool that lets a user:
1. Upload a product template image
2. Choose whether to use it once or save it as a reusable Master Template
3. Provide rotor image + part number and/or brake pad part number
4. Have the system automatically find and propose pad images (user confirms or uploads own)
5. Generate a final high-quality e-commerce product composite while strictly preserving the original template branding and layout

---

## 2. Confirmed Requirements (from user)

| Point | Decision |
|-------|----------|
| 1 & 2 | Expandable later. Templates are uploaded by user. After upload → ask “One-time use” or “Save as reusable Master Template” |
| 3 | Simple web form for now |
| 4 | Output naming includes **part numbers + customer store name** |
| 5 | Tech stack – to be recommended (see Section 5) |
| 6 | Auto-search pad images → show to customer for confirmation. If customer rejects or images are too generic → allow own upload |
| 7 | Keep extremely simple for v1 (no batch, no history, no admin) |
| 8 | Branding defined later |

---

## 3. User Flow (Exact)

### Step 1 – Template Upload
- User uploads one image (the base template)
- Form asks:
  - Template name (optional)
  - **One-time use**  OR  **Save as reusable Master Template**
  - Customer / Store name (required – used in final filename)

### Step 2 – Modifications
- **Rotor section**
  - Upload rotor image (required if changing rotors)
  - Rotor part number (e.g. DF_63326007R)
- **Brake Pads section**
  - Enter pad part number (e.g. P09028)
  - Button: “Find pads automatically”
  - System searches → shows 2–4 best product photos
  - User must **Confirm** one photo or **Upload my own pad image**
- Optional free-text instructions (advanced)

### Step 3 – Generate
- User clicks “Generate Final Product”
- System runs the locked workflow:
  1. Rotor swap (if provided)
  2. Pad swap (using confirmed image)
  3. Strict preservation of all original branding, logos, layout, hardware, text
- Shows preview
- User downloads final image

### Step 4 – Output File Naming
```
{StoreName}_{RotorPart}_{PadPart}_Final.jpg
```
Example: `MyStore_DF63326007R_P09028_Final.jpg`

---

## 4. Core Technical Rules (Never Break)

1. **Never change** any branding, logos (Brembo, ALE, etc.), text, hardware, disclaimer, or overall layout unless the user explicitly writes instructions to do so.
2. Rotor and pad replacements must match position, scale, perspective and lighting of the originals as closely as possible.
3. When searching for pads: prefer clean white-background official product photos.
4. Always show the proposed pad image to the user for confirmation before generating.
5. Final image must be high-resolution, clean, e-commerce ready (1:1 preferred, but follow the template’s aspect ratio if different).

---

## 5. Recommended Tech Stack

**Best fit for this task:**

| Layer | Recommendation | Why |
|-------|----------------|-----|
| Backend | **Python + FastAPI** | Excellent file handling, async, easy to call image AI APIs, clean validation |
| Frontend | Simple **HTML + Tailwind CSS + vanilla JS** (or lightweight Vue/React) | Fast to build, no heavy framework needed for v1 |
| Storage | Local filesystem + SQLite (or Postgres later) | Saved templates + generated results |
| Image AI | Your existing Imagine / Grok Imagine pipeline (or OpenAI / Flux / etc. later) | Same quality we already achieved |
| Hosting | Docker container on your server | Easy deploy & scale |

**Alternative if you prefer full JavaScript:**  
Node.js + Express + Next.js (still fine, but Python is more natural for this image pipeline).

I recommend starting with **FastAPI + simple HTML form**.

---

## 6. Data Model (Minimal)

### SavedTemplate
- id
- name
- store_name
- image_path
- created_at
- is_active

### GenerationJob (even if simple)
- id
- template_id (or one-time flag)
- store_name
- rotor_part
- pad_part
- final_image_path
- created_at

---

## 7. Locked Production Prompts (to be used by the tool)

### Rotor Swap Prompt (exact)
```
Replace only the two silver disc brake rotors in the first image with the black drilled and slotted brake rotor from the second image. Place two identical black rotors side by side in the exact same position, size, angle, and orientation as the original silver rotors. Keep every other element completely unchanged and identical: Brembo logo, ALE Auto Parts logo, all hardware pieces, brake pads, red/black product box, sensor wires, OEM seal, red disclaimer box, bottom gray banner with red text, white background, and full composition. Do not alter any branding, text, colors, logos, or other products. Photorealistic clean product composite.
```

### Pad Swap Prompt (exact)
```
Update the brake pads in the first image so they exactly match the real [PART_NUMBER] pads from the reference images. The pads must have the correct shape, black backing plate with brand logo and part markings, and correct friction material. Arrange four pads in the same bottom positions as currently shown. Keep the two rotors, all hardware pieces, product box, sensor wire harness, logos, OEM seal, red disclaimer box, bottom banner text, and entire layout completely unchanged. Photorealistic clean product photo.
```

---

## 8. Next Deliverables I Will Create for You

Once you say “go”, I will produce:

1. Complete project folder structure
2. FastAPI starter code (endpoints for upload, search pads, generate, download)
3. Simple but clean HTML form (upload zones, confirmation UI)
4. Prompt engine module
5. Docker setup
6. README with exact deployment steps on your server

---

## 9. Immediate Questions (only if needed)

- Do you already have an API key / access method for the image generation engine you want to use in production (Grok Imagine, Flux, Midjourney API, etc.)?
- Preferred domain or subdomain later? (not needed yet)

---

**Ready when you are.**  
Just reply with:

- “Go – start building the code”  
or  
- Any small adjustments to the flow above

I will then generate the full starter package you can drop onto your server.
