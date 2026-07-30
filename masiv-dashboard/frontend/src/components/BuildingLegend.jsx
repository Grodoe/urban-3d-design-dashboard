function classifyZoningCategory(building) {
  const raw = building?.zoning_category || "";
  if (raw) return raw;

  const zoning = (building?.zoning || "").toUpperCase();
  if (["CC-X", "DC", "MU"].some((code) => zoning.includes(code))) return "MIXED";
  if (zoning.startsWith("C") || zoning.includes("COMM")) return "COMMERCIAL";
  if (zoning.startsWith("R") || zoning.includes("RESIDENT")) return "RESIDENTIAL";
  return "DEFAULT";
}

function getCategoryCounts(buildings = []) {
  const counts = { MIXED: 0, COMMERCIAL: 0, RESIDENTIAL: 0, DEFAULT: 0 };

  buildings.forEach((building) => {
    const category = classifyZoningCategory(building);
    if (counts[category] !== undefined) counts[category] += 1;
  });

  return counts;
}

export default function BuildingLegend({ buildings = [] }) {
  const counts = getCategoryCounts(buildings);
  const legendItems = [
    { key: "MIXED", label: "Mixed-use Zoning", color: "#b98ed9", count: counts.MIXED },
    { key: "COMMERCIAL", label: "Commercial Zoning", color: "#d98e50", count: counts.COMMERCIAL },
    { key: "RESIDENTIAL", label: "Residential Zoning", color: "#7fbf8f", count: counts.RESIDENTIAL },
    { key: "DEFAULT", label: "Other / Default Zoning", color: "#6f8faf", count: counts.DEFAULT },
    { label: "Highlighted building", color: "#ffe066" },
  ];

  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Building color legend</div>
      {legendItems.map((item) => (
        <div key={item.label} style={styles.row}>
          <span style={{ ...styles.swatch, background: item.color }} />
          <span>{item.label}</span>
          {typeof item.count === "number" && <span style={styles.count}>({item.count})</span>}
        </div>
      ))}
    </div>
  );
}

const styles = {
  wrap: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 45,
    background: "#161923ee",
    border: "1px solid #3a3f4b",
    borderRadius: 10,
    padding: "12px 14px",
    color: "#eee",
    fontSize: 12,
    width: 220,
  },
  title: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: 700,
    color: "#f0f5ff",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  count: {
    marginLeft: "auto",
    color: "#9fb4d0",
    fontWeight: 600,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.15)",
    flexShrink: 0,
  },
};
