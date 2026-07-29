const legendItems = [
  { label: "Mixed-use / CC-X / DC / MU", color: "#b98ed9" },
  { label: "Commercial zoning", color: "#d98e50" },
  { label: "Residential zoning", color: "#7fbf8f" },
  { label: "Other / default zoning", color: "#6f8faf" },
  { label: "Highlighted building", color: "#ffe066" },
];

export default function BuildingLegend() {
  return (
    <div style={styles.wrap}>
      <div style={styles.title}>Building color legend</div>
      {legendItems.map((item) => (
        <div key={item.label} style={styles.row}>
          <span style={{ ...styles.swatch, background: item.color }} />
          <span>{item.label}</span>
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
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.15)",
    flexShrink: 0,
  },
};
