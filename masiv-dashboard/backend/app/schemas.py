"""Pydantic schemas used for request/response validation."""
from typing import List, Optional, Any
from pydantic import BaseModel


class Filter(BaseModel):
    attribute: str
    operator: str  # one of: > , < , >= , <= , == , contains
    value: Any


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    filters: List[Filter]
    matched_building_ids: List[str]
    explanation: str


class ProjectCreate(BaseModel):
    username: str
    project_name: str
    query_text: Optional[str] = None
    filters: List[Filter]


class ProjectOut(BaseModel):
    id: int
    name: str
    query_text: Optional[str]
    filters: List[Filter]
    created_at: str

    class Config:
        from_attributes = True
