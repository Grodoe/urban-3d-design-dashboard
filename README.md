# MASIV Calgary 3D City Dashboard

A full-stack prototype for exploring downtown Calgary through a 3D map, live
civic data, and natural-language filtering. The app is built for the MASIV
Fall 2026 intern test and currently works end to end locally with a FastAPI
backend and a Vite + React + Three.js frontend.

## What the app can do now

- Load live Calgary parcel data and live permit data for a configurable
  downtown bounding box.
- Render a 3D city scene with extruded building footprints and a live permit
  overlay.
- Let users click buildings or permits to view details in an info panel.
- Highlight matching buildings from natural-language queries such as:
  - "show DC properties"
  - "show properties with assessed value over $1,000,000"
  - "show DC properties and above $3,000,000 assessed value"
- Support direct address-like searches such as a street address or intersection,
  which can select a building directly when a match is found locally.
- Include a light-bulb hint panel with example queries in the bottom-left UI.
- Save and reload project states with username-based project persistence.
- Adjust the sun angle in real time to change lighting and shadows.
- Show a startup controls modal and a fallback banner if the live parcel API is
  unavailable.

## Stack

- Backend: Python, FastAPI, SQLAlchemy, SQLite
- Frontend: React, Vite, Three.js
- Natural-language parsing: Groq API when available, with a deterministic
  offline fallback parser when no API key is configured

## Data sources

| Data | Source | Notes |
|---|---|---|
| Parcel data, address, zoning, assessed value | City of Calgary Open Data: Current Year Property Assessments (Parcel) | Real parcel polygons and attribute data |
| Permit data | City of Calgary Open Data: Building Permits | Live civic permit layer, no API key required |

## Height handling

Calgary does not publish true building height in a free city-wide open dataset,
so the app uses a documented heuristic to estimate height from each parcel's
real zoning and assessed value. The estimate is deterministic and seeded, but
it is intended to produce a believable downtown skyline rather than claim
actual measured height.

If the live parcel API is unavailable, the backend falls back to a synthetic
4-block layout with the same data shape and flags it as a fallback so the UI
can clearly distinguish it from live data.

## Project structure

```text
masiv-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI routes and app setup
│   │   ├── calgary_data.py    # Live data fetches + fallback logic
│   │   ├── llm_query.py       # Query parsing and filter application
│   │   ├── models.py          # SQLAlchemy user/project models
│   │   ├── schemas.py         # Pydantic request/response models
│   │   └── database.py        # SQLite engine and session setup
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js             # Backend fetch wrapper
│   │   ├── geo.js             # Projection helpers
│   │   └── components/        # CityScene, QueryBar, InfoPanel, etc.
│   ├── package.json
│   └── vite.config.js
└── uml/
    ├── uml_diagram.svg
    └── uml_diagram.png
```

## Local setup

### 1. Backend

```bash
cd massiv-dashboard/backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

If you want the optional free-form LLM mode, add a Groq key to the backend
environment file:

```env
GROQ_API_KEY=your_key_here
```

Then start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Check the health endpoint at http://localhost:8000/api/health.

### 2. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend expects the backend at
http://localhost:8000 by default. Override it by setting a VITE_API_URL
environment variable if needed.

## Deployment notes

The app is designed to be deployable in a simple free-tier setup:

- Backend: Render or another Python hosting service
- Frontend: Vercel or Netlify
- Set the frontend environment variable VITE_API_URL to the deployed backend URL

## Current implementation highlights

1. Real parcel and permit data are fetched from Calgary open-data endpoints.
2. Building footprints are rendered in 3D and extruded based on the estimated
   height heuristic.
3. Queries are parsed into structured filters and applied to the building set.
4. The UI highlights matching buildings, surfaces a results list, and allows
   project save/load.
5. The app includes a small fallback mode for offline or degraded environments.

## Known limitations

- The height value is an estimate, not a measured building height.
- The project persistence layer is intentionally simple for a prototype and uses
  a local SQLite database.
- Authentication is minimal and limited to a username field, which matches the
  brief's allowance for an intern-test prototype.
