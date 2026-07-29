"""
Natural-language -> structured filter, via Groq's free-tier LLM API.

Workflow (matches the example in the brief):
  1. User types "highlight buildings over 100 feet".
  2. We send that to Groq with a prompt asking for strict JSON:
     {"filters": [{"attribute": "height_m", "operator": ">", "value": 30.5}]}
  3. We apply the filter(s) to the fetched building list in Python.
  4. Frontend highlights the matching building IDs.

Falls back to a small deterministic rule-based parser if no GROQ_API_KEY is
set (so the app still demoes without requiring a key), and again if the Groq
call fails for any reason (rate limit, network, malformed response).
"""
import json
import os
import re
from typing import Any
from warnings import filters

import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"  # fast + free-tier friendly

ALLOWED_ATTRIBUTES = ["height_m", "assessed_value", "zoning", "address"]
ALLOWED_OPERATORS = [">", "<", ">=", "<=", "==", "contains"]

SYSTEM_PROMPT = f"""You convert a natural-language request about city buildings into a JSON filter.

Respond with ONLY valid JSON, no prose, no markdown fences, in this exact shape:
{{"filters": [{{"attribute": "<attr>", "operator": "<op>", "value": <value>}}]}}

Allowed attribute names (use exactly these): {ALLOWED_ATTRIBUTES}
Allowed operators: {ALLOWED_OPERATORS}

Rules:
- "height over/above/taller than X feet" -> attribute "height_m", operator ">", value = X * 0.3048 (convert feet to meters, round to 1 decimal)
- "height over/above X meters" -> attribute "height_m", value = X directly
- "commercial buildings" / "residential buildings" -> attribute "zoning", operator "contains", value a short zoning substring like "C-" or "RC-"
- "value/cost/worth less than $X" or "under $X" -> attribute "assessed_value", operator "<", value = X (numeric, no $ or commas)
- "zoned RC-G" / "in RC-G zoning" -> attribute "zoning", operator "contains", value "RC-G"
- If the request implies more than one condition, return multiple entries in "filters".
- If you cannot confidently parse a filter, return {{"filters": []}}.
"""


def _rule_based_fallback(query: str) -> list[dict[str, Any]]:
    """Small deterministic parser used when Groq is unavailable, so the demo
    still works offline / without an API key."""
    q = query.lower()
    filters = []

    m = re.search(r"(over|above|more than|greater than|taller than)\s+(\d+)\s*(feet|ft|foot)", q)
    if m:
        feet = float(m.group(2))
        filters.append({"attribute": "height_m", "operator": ">", "value": round(feet * 0.3048, 1)})

    m = re.search(r"(over|above|more than|greater than|taller than)\s+(\d+)\s*(meters|metres|m)\b", q)
    if m:
        filters.append({"attribute": "height_m", "operator": ">", "value": float(m.group(2))})

    m = re.search(r"(under|less than|below)\s*\$?\s*([\d,]+)", q)
    if m and ("value" in q or "cost" in q or "worth" in q or "$" in q):
        val = float(m.group(2).replace(",", ""))
        filters.append({"attribute": "assessed_value", "operator": "<", "value": val})

    STOPWORDS = {"buildings", "properties", "areas", "zones", "zone", "building",
             "district", "districts", "show", "the", "any", "all"}

    def _clean_code(token: str) -> str | None:
        return token.upper() if token and token not in STOPWORDS else None

    zoning_value = None

    # "DC zoned" / "RC-G zoning" - code appears BEFORE the keyword
    m = re.search(r"\b([a-z]{1,4}(?:-[a-z0-9]{1,4})?)\s+zon(?:ed|ing)?\b", q)
    if m:
        zoning_value = _clean_code(m.group(1))

    # "zoned DC" / "zoning of RC-G" - code appears AFTER the keyword
    if not zoning_value:
        m = re.search(r"zon(?:ed|ing)?\s+(?:of\s+|in\s+)?([a-z0-9\-]+)", q)
        if m:
            zoning_value = _clean_code(m.group(1))

    if zoning_value:
        filters.append({"attribute": "zoning", "operator": "contains", "value": zoning_value})
    elif "commercial" in q:
        filters.append({"attribute": "zoning", "operator": "contains", "value": "C-"})
    elif "residential" in q:
        filters.append({"attribute": "zoning", "operator": "contains", "value": "R"})

    return filters


def parse_query_to_filters(query: str) -> list[dict[str, Any]]:
    if not GROQ_API_KEY:
        return _rule_based_fallback(query)

    try:
        resp = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": query},
                ],
                "temperature": 0,
                "max_tokens": 300,
            },
            timeout=15,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        content = re.sub(r"^```(json)?|```$", "", content, flags=re.MULTILINE).strip()
        parsed = json.loads(content)
        filters = parsed.get("filters", [])
        # Basic validation - never trust the LLM's output blindly.
        clean = []
        for f in filters:
            if f.get("attribute") in ALLOWED_ATTRIBUTES and f.get("operator") in ALLOWED_OPERATORS:
                clean.append(f)
        return clean if clean else _rule_based_fallback(query)
    except Exception:  # noqa: BLE001 - any failure -> safe fallback, never crash the request
        return _rule_based_fallback(query)


def apply_filters(buildings: list[dict], filters: list[dict[str, Any]]) -> list[str]:
    """Returns the list of building IDs matching ALL given filters (AND logic)."""
    if not filters:
        return []

    matched = []
    for b in buildings:
        if all(_matches(b, f) for f in filters):
            matched.append(b["id"])
    return matched


def _matches(building: dict, f: dict[str, Any]) -> bool:
    attr, op, value = f.get("attribute"), f.get("operator"), f.get("value")
    actual = building.get(attr)
    if actual is None:
        return False

    try:
        if op == "contains":
            return str(value).upper() in str(actual).upper()
        actual_num, value_num = float(actual), float(value)
        if op == ">":
            return actual_num > value_num
        if op == "<":
            return actual_num < value_num
        if op == ">=":
            return actual_num >= value_num
        if op == "<=":
            return actual_num <= value_num
        if op == "==":
            return actual_num == value_num
    except (TypeError, ValueError):
        return str(value).lower() == str(actual).lower()
    return False
