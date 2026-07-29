"""
ORM models.

User        - identified only by a username (no auth/password, per the brief:
              "a simple username input field is sufficient").
Project     - a saved set of LLM-derived filters + metadata, owned by a User.

See /uml/uml_diagram.png for the class diagram this maps to.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    projects = relationship(
        "Project", back_populates="owner", cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # The natural-language query the user typed, kept for display/history.
    query_text = Column(Text, nullable=True)

    # The structured filter(s) the LLM extracted from that query, stored as
    # a JSON string, e.g. '[{"attribute": "height_m", "operator": ">", "value": 100}]'
    filters_json = Column(Text, nullable=False, default="[]")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="projects")
