import { useEffect, useState, useCallback } from "react";
import CityScene from "./components/CityScene";
import StartupModal from "./components/StartupModal";
import QueryBar from "./components/QueryBar";
import InfoPanel from "./components/InfoPanel";
import ProjectPanel from "./components/ProjectPanel";
import SunSlider from "./components/SunSlider";
import PermitToggle from "./components/PermitToggle";
import { api } from "./api";

export default function App() {
  const [buildings, setBuildings] = useState([]);
  const [dataSource, setDataSource] = useState(null);
  const [permits, setPermits] = useState([]);
  const [showPermits, setShowPermits] = useState(true);

  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [lastExplanation, setLastExplanation] = useState("");
  const [lastFilters, setLastFilters] = useState([]);
  const [lastQuery, setLastQuery] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);

  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedPermit, setSelectedPermit] = useState(null);

  const [username, setUsername] = useState("");
  const [projectName, setProjectName] = useState("");

  const [sunAngle, setSunAngle] = useState(0.55);
  const [showStartup, setShowStartup] = useState(() => {
    try { return !localStorage.getItem("masiv_controls_seen"); } catch { return true; }
  });

  useEffect(() => {
    api.getBuildings().then((res) => {
      setBuildings(res.buildings);
      setDataSource(res.data_source);
    });
    api.getPermits().then((res) => setPermits(res.permits));
  }, []);

  const runQuery = useCallback(async (query) => {
    setQueryLoading(true);
    try {
      // Quick client-side address lookup: if the user typed an address-like
      // query (contains a number and street tokens), try to find a building
      // locally and select it without calling the backend.
      const cleaned = query.replace(/^(show|show me|find|select|highlight)\s+/i, "").trim();
      const hasNumber = /\d/.test(cleaned);
      if (hasNumber && buildings && buildings.length > 0) {
        const q = cleaned.toUpperCase();
        // Try to match by full substring, then by dropping leading verb words.
        let matched = buildings.find((b) => b.address && b.address.toUpperCase().includes(q));
        if (!matched) {
          // Try matching using only the alphabetic parts (e.g. "AV SW")
          const alpha = q.replace(/[^A-Z\s]/g, "").trim();
          if (alpha) matched = buildings.find((b) => b.address && b.address.toUpperCase().includes(alpha));
        }
        if (matched) {
          setHighlightedIds(new Set([matched.id]));
          setSelectedBuilding(matched);
          setLastExplanation(`Selected ${matched.address}`);
          return;
        }
      }
      const res = await api.runQuery(query);
      setHighlightedIds(new Set(res.matched_building_ids));
      setLastExplanation(res.explanation);
      setLastFilters(res.filters);
      setLastQuery(query);
    } catch (e) {
      setLastExplanation("Query failed: " + e.message);
    } finally {
      setQueryLoading(false);
    }
  }, []);

  function handleLoadProject(project) {
    setLastFilters(project.filters);
    setLastQuery(project.query_text || "");
    // Re-apply the loaded filters client-side by re-running the same query
    // text through the backend (keeps filter-application logic in one place).
    if (project.query_text) runQuery(project.query_text);
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <CityScene
        buildings={buildings}
        permits={permits}
        highlightedIds={highlightedIds}
        showPermits={showPermits}
        onSelectBuilding={setSelectedBuilding}
        selectedBuilding={selectedBuilding}
        onSelectPermit={setSelectedPermit}
        sunAngle={sunAngle}
      />

      {showStartup && (
        <StartupModal onClose={() => { try { localStorage.setItem("masiv_controls_seen", "1"); } catch {} setShowStartup(false); }} />
      )}

      <QueryBar onRunQuery={runQuery} lastExplanation={lastExplanation} loading={queryLoading} />

      <InfoPanel
        building={selectedBuilding}
        permit={selectedPermit}
        onClose={() => { setSelectedBuilding(null); setSelectedPermit(null); }}
      />

      <ProjectPanel
        username={username} setUsername={setUsername}
        projectName={projectName} setProjectName={setProjectName}
        currentQuery={lastQuery} currentFilters={lastFilters}
        onLoadProject={handleLoadProject}
      />

      <PermitToggle showPermits={showPermits} setShowPermits={setShowPermits} />
      <SunSlider value={sunAngle} onChange={setSunAngle} />

      {dataSource === "synthetic_fallback" && (
        <div style={bannerStyle}>
          Live Calgary parcel API unavailable right now - showing a synthetic
          4-block layout with the same data shape (permits below are still live).
        </div>
      )}
    </div>
  );
}

const bannerStyle = {
  position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)",
  background: "#3a2f12ee", border: "1px solid #6b5420", color: "#ffe9b3",
  padding: "8px 14px", borderRadius: 8, fontSize: 12, zIndex: 10, maxWidth: 480, textAlign: "center",
};
