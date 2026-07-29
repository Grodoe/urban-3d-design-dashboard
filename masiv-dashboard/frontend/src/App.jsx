import { useEffect, useState, useCallback } from "react";
import CityScene from "./components/CityScene";
import StartupModal from "./components/StartupModal";
import QueryBar from "./components/QueryBar";
import InfoPanel from "./components/InfoPanel";
import ProjectPanel from "./components/ProjectPanel";
import SunSlider from "./components/SunSlider";
import PermitToggle from "./components/PermitToggle";
import BuildingLegend from "./components/BuildingLegend";
import ResultsList from "./components/ResultsList";  
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
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);
  const matchedBuildings = buildings.filter((b) => highlightedIds.has(b.id));

  useEffect(() => {
    let mounted = true;
    setLoadingData(true);
    (async () => {
      try {
        const [bRes, pRes] = await Promise.all([api.getBuildings(), api.getPermits()]);
        if (!mounted) return;
        setBuildings(bRes.buildings);
        setDataSource(bRes.data_source);
        setPermits(pRes.permits);
        setDataError(null);
      } catch (e) {
        if (!mounted) return;
        setDataError(e && e.message ? `Failed to load city data: ${e.message}` : "Failed to load city data.");
      } finally {
        if (mounted) setLoadingData(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const clearSearch = useCallback(() => {
    setHighlightedIds(new Set());
    setSelectedBuilding(null);
    setSelectedPermit(null);
    setLastExplanation("");
    setLastFilters([]);
    setLastQuery("");
  }, []);

  const runQuery = useCallback(async (query) => {
    if (!query.trim()) {
      clearSearch();
      return;
    }
    // Deselect any currently selected building immediately when a new
    // prompt is submitted so the UI reflects the incoming search state.
    setSelectedBuilding(null);
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
  }, [buildings, clearSearch]);

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
      {dataError && (
        <div style={errorBannerStyle}>{dataError}</div>
      )}

      {loadingData && (
        <div style={spinnerOverlay}>
          <svg width="54" height="54" viewBox="0 0 50 50" style={{ display: "block" }}>
            <circle cx="25" cy="25" r="20" stroke="#4a7dfc" strokeWidth="4" strokeLinecap="round" fill="none" strokeOpacity="0.18" />
            <path d="M45 25a20 20 0 0 1-20 20" stroke="#4a7dfc" strokeWidth="4" strokeLinecap="round" fill="none">
              <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
            </path>
          </svg>
          <div style={{ color: "#cbd6e6", marginTop: 8 }}>Loading city data…</div>
        </div>
      )}
      <QueryBar onRunQuery={runQuery} onClear={clearSearch} lastExplanation={lastExplanation} loading={queryLoading} />
      
      <ResultsList
        buildings={matchedBuildings}
        selectedId={selectedBuilding?.id}
        onSelect={(b) => { setSelectedBuilding(b); setSelectedPermit(null); }}
        onClear={clearSearch}
      />

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

      <BuildingLegend />
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

const errorBannerStyle = {
  ...bannerStyle,
  background: "#7a1f1f", border: "1px solid #a33b3b", color: "#ffecec", zIndex: 80,
};

const spinnerOverlay = {
  position: "absolute", left: 0, top: 0, right: 0, bottom: 0,
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  background: "rgba(2,6,12,0.32)", zIndex: 9998,
};
