// Base URL of the FastAPI backend. Set VITE_API_URL when deploying the
// frontend separately from the backend (e.g. Vercel frontend + Render
// backend). Defaults to localhost for local dev.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function json(res) {
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  getBuildings: () => fetch(`${API_BASE}/api/buildings`).then(json),
  getPermits: () => fetch(`${API_BASE}/api/permits`).then(json),

  runQuery: (query) =>
    fetch(`${API_BASE}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    }).then(json),

  saveProject: (username, project_name, query_text, filters) =>
    fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, project_name, query_text, filters }),
    }).then(json),

  listProjects: (username) =>
    fetch(`${API_BASE}/api/projects/${encodeURIComponent(username)}`).then(json),

  getProject: (id) => fetch(`${API_BASE}/api/projects/detail/${id}`).then(json),
};
