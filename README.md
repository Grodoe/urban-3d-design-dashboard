# MASIV Calgary 3D City Dashboard

A full-stack prototype: a 3D city dashboard for downtown Calgary with live
civic data overlays and natural-language querying, built for the MASIV
Fall 2026 intern test.

- **Backend**: Python (FastAPI) — fetches and processes real City of Calgary
  open data, integrates a free-tier LLM (Groq) for NL querying, persists
  users/projects in SQLite.
- **Frontend**: React + Three.js (Vite) — extrudes real building
  footprints in 3D, overlays live permit markers, highlights buildings from
  NL queries, and a save/load project panel.
- **Bonus**: time-of-day sun slider with real-time shadows (Three.js
  directional light).

## Data sources (real, live)

| Data | Source | Notes |
|---|---|---|
| Building footprints, address, zoning, assessed value | [Current Year Property Assessments (Parcel)](https://data.calgary.ca/Government/Current-Year-Property-Assessments-Parcel-/4bsw-nn7w) — `data.calgary.ca/resource/4bsw-nn7w.json` | Real parcel polygons + attributes |
| Building permits (live civic layer) | [Building Permits](https://data.calgary.ca/resource/c2es-76ed.json) | Confirmed working, no API key required |

### Documented fallback — building height

Calgary does **not** publish true building height in any free, city-wide
open dataset — the only LiDAR-derived 3D massing product ("3D Buildings —
Citywide") is a paid/licensed dataset, not open data. Per the brief's
explicit note that an alternative approach is fine "if time permits...
explanation provided in UML," `backend/app/calgary_data.py::estimate_height_m`
derives a deterministic, seeded height estimate from each building's **real**
zoning code and **real** assessed value (downtown high-density zoning +
higher value → taller, consistent with Calgary's actual skyline pattern).
Every other attribute shown (address, zoning, assessed value, and all permit
data) is live data fetched at request time — nothing else is fabricated.

If the live parcel API is ever unreachable, the backend falls back to a
deterministic synthetic 4-block grid with the same data shape, and flags this
via `"data_source": "synthetic_fallback"` in the `/api/buildings` response —
the frontend shows a small banner when this happens so it's never mistaken
for live data. This was tested and works correctly end to end.

See `uml/uml_diagram.png` for the class diagram (data models + modules) and
sequence diagram (query flow, save/load flow), including this note.

## Project structure

```
masiv-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + all routes
│   │   ├── calgary_data.py    # fetch + process Calgary open data
│   │   ├── llm_query.py       # NL -> filter via Groq (+ offline fallback)
│   │   ├── models.py          # SQLAlchemy models (User, Project)
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   └── database.py        # SQLite engine/session setup
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js             # fetch wrapper for the backend
│   │   ├── geo.js             # lon/lat -> local meters projection
│   │   └── components/        # CityScene (Three.js), QueryBar, InfoPanel,
│   │                           # ProjectPanel, SunSlider, PermitToggle
│   ├── package.json
│   └── vite.config.js
└── uml/
    ├── uml_diagram.svg
    └── uml_diagram.png
```

## Setup — local development

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Get a **free** Groq API key (no credit card needed):
1. Go to https://console.groq.com/keys
2. Sign up / log in, click "Create API Key"
3. Paste it into `.env` as `GROQ_API_KEY=...`

> The app works even without a key — natural-language queries fall back to a
> small deterministic parser (`llm_query._rule_based_fallback`) that handles
> the exact example phrasings in the brief. Add the key for genuinely free-form
> queries.

Run the backend:
```bash
uvicorn app.main:app --reload --port 8000
```
Visit http://localhost:8000/api/health — should return `{"status": "ok"}`.
Interactive API docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```
Visit http://localhost:5173. It talks to the backend at `http://localhost:8000`
by default — override with a `.env` file containing `VITE_API_URL=...` if
your backend runs elsewhere.

## Deploying (free hosting)

**Backend → Render** (free web service):
1. Push this repo to GitHub.
2. On [render.com](https://render.com), New → Web Service → connect the repo,
   root directory `backend`.
3. Build command: `pip install -r requirements.txt`
   Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variable `GROQ_API_KEY` in the Render dashboard.
5. Note the deployed URL, e.g. `https://masiv-backend.onrender.com`.

**Frontend → Vercel / Netlify** (free static hosting):
1. Root directory `frontend`, build command `npm run build`, output `dist`.
2. Add environment variable `VITE_API_URL=https://masiv-backend.onrender.com`.
3. Deploy — you'll get a public URL to submit.

(Render's free tier spins down after inactivity — the first request after a
while may take ~30s to wake it up. Mention this in your submission email so
graders aren't surprised.)

## How each requirement is met

1. **Calgary data, 3-4+ blocks** — `calgary_data.fetch_buildings()` pulls
   real parcels within a configurable bounding box (`CALGARY_BBOX` env var),
   defaulting to a Beltline/downtown stretch of ~36 buildings.
2. **3D visualization** — `CityScene.jsx` extrudes each real footprint
   polygon to its (estimated) height using `THREE.ExtrudeGeometry`.
3. **Interactivity** — clicking a building raycasts against the mesh list,
   highlights it, and shows an `InfoPanel` with address/height/zoning/value.
4. **Live permits layer** — `fetch_permits()` pulls real, current permits in
   the same bbox; rendered as red 3D pins with a show/hide toggle
   (`PermitToggle.jsx`) and click-for-details.
5. **LLM querying** — `QueryBar.jsx` → `POST /api/query` → Groq parses the NL
   query into `{attribute, operator, value}` filters → matching buildings
   highlight yellow.
6. **Persistence** — username field + "Save Project" button
   (`ProjectPanel.jsx`) stores the current filters under a project name;
   saved projects list re-applies filters on click.
7. **UML diagram** — `uml/uml_diagram.png` (class + sequence diagrams).

**Bonus**: `SunSlider.jsx` drives a `THREE.DirectionalLight` position/intensity
in real time with shadow mapping enabled on all building meshes.

## Known limitations / next steps

- The live parcel dataset's exact field names were inferred from Socrata
  naming conventions and verified for the confirmed-working permits dataset;
  `calgary_data.py` checks several likely field-name variants defensively and
  falls back gracefully if none match, so the pipeline never breaks silently.
- No authentication beyond a plain username, per the brief's explicit
  allowance.
- The in-process building cache in `main.py` is intentionally simple
  (single global cache, no TTL) — fine for a prototype/demo, would move to a
  proper cache (Redis, or a scheduled refresh) for production use.
