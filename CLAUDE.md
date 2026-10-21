# grock-to-app — Product Template Generator Tool (client project)

## What this is

A client's brake-rotor/pad product-image tool, originally built end-to-end in a Grok chat
session (FastAPI backend), that we're taking over for deployment and finishing. This repo
is the new frontend being built for it (stack decided below). The original backend package
the client sent lives outside this repo, in Downloads — see "Source package" below.

## Business context

- Client runs a brake parts business tied to "Ale Auto Parts" on eBay
  (https://www.ebay.com/itm/287650461032 — reference listing showing the exact branded
  template style: Brembo + ALE logo fixed, OEM seal, rotor+pad photos swapped per listing).
- The tool: user uploads a branded product template image, picks/uploads a rotor photo +
  pad part reference, and the tool generates a final e-commerce composite image. All
  original branding/logos/hardware/text/layout must stay unchanged — only the rotor and
  pad images are swapped in.
- Output file naming convention: `{StoreName}_{RotorPart}_{PadPart}_Final.jpg`
- This workflow was already proven manually (client was doing it by hand inside the Grok
  chat, describing/generating images there) before being turned into a web app.

## Source package (backend, built via Grok)

Delivered by the client on 2026-10-16 to Downloads (`C:\Users\MS\Downloads\`):
- `product_template_tool/` — full code (also `product_template_tool.tar.gz`)
- `IT_HANDOFF_Product_Template_Tool.md` — full handoff doc (architecture, deploy steps)
- `IT_EMAIL_BRIEF.txt` — short summary version
- `CPANEL_INSTALL.md` — HostGator cPanel install steps (not usable, see below)

Backend stack: Python 3.11+ / FastAPI, SQLite (aiosqlite) for saved templates/jobs,
Docker + docker-compose, Jinja/HTML + Tailwind CDN + vanilla JS frontend (being replaced
by this Nuxt app), `passenger_wsgi.py` (cPanel bridge, not used — see hosting below).

Key files in that package:
- `app/main.py` — FastAPI routes
- `app/services.py` — upload logic + `generate_final_image()` — **currently a placeholder**,
  it just copies the template; no real AI image API is wired in yet
- `app/prompts.py` — locked production prompts: `ROTOR_SWAP_PROMPT`,
  `pad_swap_prompt(part_number)` — do not change lightly, client's business rule is baked
  into them (preserve branding, swap rotor/pad only)
- `app/models.py` — SQLite models

## Hosting

- Client's existing site is on HostGator **shared** hosting (cPanel) — no Python/Docker
  support, so the FastAPI app cannot run there. This is a hosting limitation, not a problem
  with the tool.
- Decision: keep the client's main website on HostGator as-is, run this tool on a small
  VPS (~$5/mo) with Docker + Nginx + SSL, exposed via a subdomain (e.g.
  `tool.clientdomain.com`).
- Hosting/server setup is on **our** side, not the client's — don't ask the client for
  domain name or hosting account access.

## Decisions made so far

- Image generation was manual (inside Grok chat) until now — no API was ever connected.
  We will wire a real image API (OpenAI, Google, or xAI — final pick still TBD, choose on
  quality/cost for this composite-image use case) into `generate_final_image()`.
- Frontend: rebuilding in **Nuxt 3**, calling the existing FastAPI backend as an API
  (scaffolded 2026-10-16, no feature work done yet — see "Status" below).

## Open questions (not yet answered by client)

- None blocking right now — waiting on client to confirm with "Amir" before we lock in
  the image API (see below).

## Resolved

- Who uses it: client confirmed (2026-10-16) this is a "beta" tool — he'll use and perfect
  it himself first, before incorporating it into Synergy's OMS. So v1 is internal/single-user
  only, no auth needed yet. Revisit auth when/if it's wired into Synergy.
- Client owns Synergy (said directly, 2026-10-16) — so "incorporating into Synergy's OMS"
  means his own system, not a third party's.
- Image API preference: client wants **xAI** (Grok's image API) — he says he already has
  an "id developed on grok" (existing xAI/Grok account, possibly credits already set up,
  worth checking before assuming we need a fresh account). He's checking with "Amir" first
  to make sure they get the best deal since they're paying for it. Treat xAI as the likely
  pick pending that confirmation — don't lock in another provider (OpenAI/Google) without
  checking back.

## Status (as of 2026-10-16)

- Reviewed client's full code package and handoff docs.
- Confirmed hosting plan (VPS + Docker + Nginx, not HostGator shared).
- Confirmed image generation has been manual so far.
- 2026-10-18: backend copied into `backend/` and turned into a JSON-only API (Jinja page
  removed; added `GET /api/templates`, `DELETE /api/templates/{id}` soft-delete; client paths
  now resolved by basename inside `uploads/<subfolder>` to block path traversal; upload size
  limit enforced; part numbers in filenames are alphanumeric-only per spec). Nuxt UI built
  (`app/pages/index.vue`, `app/components/ImageDrop.vue`), proxying to the backend via
  `routeRules`. Not yet run against the real backend (no Python on the dev machine).
- 2026-10-18: frontend also supports a static build (`NUXT_PUBLIC_API_BASE` + backend `CORS_ORIGINS`) so it can sit on the client's HostGator subdomain with the backend on Render (testing) / VPS — see end of DEPLOY.md.
- Deployment config added 2026-10-18 (root docker-compose.yml, Dockerfile, deploy/nginx, DEPLOY.md) — not yet tested (no Docker on dev machine).
- Live demo (2026-10-18, free, no card): frontend https://product-template-generator.vercel.app
  (Vercel project `product-template-generator`, env `NUXT_PUBLIC_API_BASE`); backend on
  PythonAnywhere free https://ameerhamza6273.pythonanywhere.com (repo cloned at
  `~/grock-to-app`, WSGI file imports `backend/wsgi.py`, `backend/.env` holds `CORS_ORIGINS`).
  Update backend: `git pull` in PA console + `touch /var/www/ameerhamza6273_pythonanywhere_com_wsgi.py`.
  PA free site must be extended monthly (Web tab, "Run until 1 month from today"); its outbound
  internet is allowlisted, so the real image API will likely need a paid plan or the VPS.
  Render/HF Spaces were tried: Render needs a card even for free, HF Docker Spaces are paid now.
  GitHub repo is public (user's choice).
- 2026-10-18: demo link + requests sent to client (via user). Our recommendation changed to
  **Google Gemini (Nano Banana 2.1)** as the cheapest (~$0.07–0.11 per final listing vs xAI
  ~$0.12–0.20, two edit calls each; rough figures from mixed sources). Plan: A/B test Gemini vs
  xAI on 3–5 real client templates, pick whichever preserves branding best. Client's Grok chat
  subscription does not cover API usage. Asked client for: Amir's OK on API, hi-res templates,
  sample rotor/pad photos, screenshots of his current/old system (to match design/workflow),
  preferred subdomain. Don't tell client "Claude can't make images" (user said already covered).
  Waiting on client reply.
- 2026-10-19: client replied (likes our demo UI/workflow). Sent `Downloads\Testing App.zip`:
  template PNG 1350x1350 (2 angled drilled/slotted rotors, 4 staggered pads, hardware clips),
  `DF_61040036_Ang.jpg` / `DF_61040036_Fro.jpg` (rotor, 1500px, white bg),
  `BR_P09004N_Bac.jpg` (4 pads grid, 2500px, white bg). Real use case: workers get a batch of
  listings, swap part numbers + photos, save finals (Canva takes 20–25 min each). Priority:
  cheapest + reliable. Hosting: `picapp.synergyparts.co` or `synergy-parts.com`.
  Our proposal: deterministic compositing (cut out white bg, place in fixed slots on a blank
  template) instead of generative AI — $0/image, branding untouched; AI only optional fallback.
  Part numbers can be parsed from filenames (`DF_<rotor>_<view>`, `BR_<pad>_<view>`).
  Asked client for blank template export from Canva and DNS contact. Canva Autofill API is
  Enterprise-only, so not the affordable route.
- 2026-10-19: client said "Would love to see it" → made a demo composite with a Node/sharp
  script (scratchpad, not in repo): products placed under an overlay cut from the template
  (badge, slogan, OEM seal, hardware sit on top). Looked right on first real test.
  Client also asked if this helps product images for **LogicAutoParts** (our parts store,
  has products + fitment) and where images come from. Answer: the tool doesn't fetch images,
  it uses photos the user provides; it can bulk-generate per part number if the store's
  product data has image URLs/files (source still unknown, asked).
- 2026-10-19: client asked for blank template (will send "later today"). Built the batch flow
  into the Nuxt app, compositing **in the browser** (canvas, no backend, no AI):
  `app/utils/templates.ts` (layout: slots + `keep` mask for top layer), `app/utils/compose.ts`,
  `app/components/PhotoDrop.vue`, new `app/pages/index.vue` (template → photos grouped by part
  number from filename → listings auto-paired → create all → ZIP via `fflate`). Template image
  in `public/templates/brembo-ale.png`. Tested in Chrome with client's photos: ~1.5 s/image.
  The page no longer calls the FastAPI backend (kept for a possible AI fallback). When the
  blank Canva template arrives: swap the PNG and simplify `keep` (overlay export if provided).
- 2026-10-20: client sent the blank template as 2 WhatsApp JPEGs (1600px): base layer (logos,
  seal, hardware, footer; no products) → `public/templates/brembo-ale.jpg`, and top layer
  (badge, slogan, red rules on white) → `brembo-ale-top.jpg`. App now layers base → products →
  overlay; old PNG with baked-in products removed. Tested live on Vercel 2026-10-21 (1600x1600 output, looks right).
  2026-10-21: client sent the original Canva PNGs (1620px, `Downloads\Requested Info 10-20-2026`),
  now `public/templates/brembo-ale.png` / `brembo-ale-top.png`, plus a 2nd test set (P44028:
  silver drilled rotor, red pads). Both sets tested in Chrome, look right.
- 2026-10-21: user decided we don't hand-build a template per brand. Step 1 now has "Use your own
  template": user uploads one blank background (no top banner, user's call); products go in the
  same slots as Brembo (`productSlots` in templates.ts), drawn on top of everything. Tested in Chrome.
- Next: pick image API (waiting on client/Amir), provision the VPS and
  follow DEPLOY.md, real pad search.

## Working notes

- This is a client-liaison project: the user (who gives me instructions) is relaying
  between a non-technical client and the technical work, drafting emails for the user to
  review and send themselves — I never send anything directly.
- Don't re-ask the client things already confirmed above (manual image generation,
  branding rules, hosting being on our side, no domain needed from them).
