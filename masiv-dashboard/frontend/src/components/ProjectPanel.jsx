import { useState, useEffect } from "react";
import { api } from "../api";

export default function ProjectPanel({
  username, setUsername,
  projectName, setProjectName,
  currentQuery, currentFilters,
  onLoadProject,
}) {
  const [projects, setProjects] = useState([]);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (username) refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  async function refreshProjects() {
    try {
      const res = await api.listProjects(username);
      setProjects(res.projects || []);
    } catch {
      setProjects([]);
    }
  }

  async function handleSave() {
    if (!username || !projectName) {
      setStatus("Enter a username and project name first.");
      return;
    }
    try {
      await api.saveProject(username, projectName, currentQuery, currentFilters || []);
      setStatus(`Saved "${projectName}".`);
      refreshProjects();
    } catch (e) {
      setStatus("Save failed: " + e.message);
    }
  }

  async function handleLoad(id) {
    try {
      const project = await api.getProject(id);
      onLoadProject(project);
      setStatus(`Loaded "${project.name}".`);
    } catch (e) {
      setStatus("Load failed: " + e.message);
    }
  }

  return (
    <div style={styles.wrap}>
      <button style={styles.toggle} onClick={() => setOpen(!open)}>
        {open ? "Hide projects" : "Projects"}
      </button>
      {open && (
        <div style={styles.body}>
          <label style={styles.label}>Username</label>
          <input style={styles.input} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. gordon" />

          <label style={styles.label}>Project name</label>
          <input style={styles.input} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. tall-downtown-buildings" />

          <button style={styles.saveBtn} onClick={handleSave}>Save current filters as project</button>

          {status && <div style={styles.status}>{status}</div>}

          <div style={styles.listHeader}>Saved projects</div>
          <div style={styles.list}>
            {projects.length === 0 && <div style={styles.empty}>No saved projects yet.</div>}
            {projects.map((p) => (
              <div key={p.id} style={styles.item} onClick={() => handleLoad(p.id)}>
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                {p.query_text && <div style={styles.itemQuery}>"{p.query_text}"</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: "absolute", bottom: 16, left: 16, zIndex: 10, fontSize: 13, color: "#eee" },
  toggle: {
    padding: "8px 14px", borderRadius: 8, border: "1px solid #3a3f4b",
    background: "#161923", color: "#eee", cursor: "pointer",
  },
  body: {
    marginTop: 8, width: 260, background: "#161923ee", border: "1px solid #3a3f4b",
    borderRadius: 10, padding: 14,
  },
  label: { display: "block", marginTop: 8, marginBottom: 2, color: "#9aa1b0", fontSize: 11 },
  input: { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #3a3f4b", background: "#0f1117", color: "#eee", boxSizing: "border-box" },
  saveBtn: { marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 6, border: "none", background: "#4a7dfc", color: "white", fontWeight: 600, cursor: "pointer" },
  status: { marginTop: 8, fontSize: 12, color: "#9fd0a5" },
  listHeader: { marginTop: 12, fontSize: 11, color: "#9aa1b0" },
  list: { maxHeight: 140, overflowY: "auto", marginTop: 4 },
  item: { padding: "6px 4px", borderBottom: "1px solid #262b38", cursor: "pointer" },
  itemQuery: { fontSize: 11, color: "#9aa1b0" },
  empty: { fontSize: 12, color: "#666" },
};
