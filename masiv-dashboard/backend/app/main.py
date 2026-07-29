"""
MASIV Intern Test - Urban Design 3D City Dashboard backend.

Endpoints:
  GET  /api/buildings          - fetched + processed Calgary parcel data
  GET  /api/permits            - live building permits layer
  POST /api/query              - NL query -> LLM filter -> matched building IDs
  POST /api/projects           - save a project (username + filters)
  GET  /api/projects/{username}- list a user's saved projects
  GET  /api/projects/detail/{id} - load one project's filters
"""
import json
import logging

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import calgary_data, llm_query, models, schemas
from .database import Base, engine, get_db

logging.basicConfig(level=logging.INFO)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MASIV City Dashboard API")

# Wide-open CORS: this is an intern-test prototype meant to be hit from a
# separately-hosted static frontend (Vercel/Netlify) during grading.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple in-process cache so repeated /api/query calls in a session don't
# re-hit the Calgary API every time (kept intentionally simple - see README).
_buildings_cache: dict | None = None


def _get_buildings() -> dict:
    global _buildings_cache
    if _buildings_cache is None:
        _buildings_cache = calgary_data.fetch_buildings()
    return _buildings_cache


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/buildings")
def get_buildings():
    return _get_buildings()


@app.get("/api/permits")
def get_permits():
    return {"permits": calgary_data.fetch_permits()}


@app.post("/api/query", response_model=schemas.QueryResponse)
def run_query(req: schemas.QueryRequest):
    buildings = _get_buildings()["buildings"]
    filters = llm_query.parse_query_to_filters(req.query)
    matched = llm_query.apply_filters(buildings, filters)
    explanation = (
        f"Parsed {len(filters)} filter(s) from your query and matched "
        f"{len(matched)} of {len(buildings)} buildings."
        if filters else
        "Could not confidently extract a filter from that query - try "
        "something like 'buildings over 100 feet' or 'commercial buildings'."
    )
    return {"filters": filters, "matched_building_ids": matched, "explanation": explanation}


@app.post("/api/projects", response_model=schemas.ProjectOut)
def save_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(username=payload.username).first()
    if not user:
        user = models.User(username=payload.username)
        db.add(user)
        db.commit()
        db.refresh(user)

    project = models.Project(
        name=payload.project_name,
        owner_id=user.id,
        query_text=payload.query_text,
        filters_json=json.dumps([f.model_dump() for f in payload.filters]),
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    return schemas.ProjectOut(
        id=project.id,
        name=project.name,
        query_text=project.query_text,
        filters=payload.filters,
        created_at=project.created_at.isoformat(),
    )


@app.get("/api/projects/{username}")
def list_projects(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(username=username).first()
    if not user:
        return {"projects": []}
    return {
        "projects": [
            {
                "id": p.id,
                "name": p.name,
                "query_text": p.query_text,
                "created_at": p.created_at.isoformat(),
            }
            for p in user.projects
        ]
    }


@app.get("/api/projects/detail/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(models.Project).get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return schemas.ProjectOut(
        id=project.id,
        name=project.name,
        query_text=project.query_text,
        filters=json.loads(project.filters_json),
        created_at=project.created_at.isoformat(),
    )
