export default function InfoPanel({ building, permit, onClose }) {
  if (!building && !permit) return null;

  return (
    <div style={styles.panel}>
      <button style={styles.closeBtn} onClick={onClose}>×</button>
      {building && (
        <>
          <h3 style={styles.title}>{building.address}</h3>
          <Row label="Height" value={`${building.height_m.toFixed(1)} m`} />
          <Row label="Zoning" value={building.zoning} />
          <Row label="Assessed value" value={`$${Number(building.assessed_value).toLocaleString()}`} />
        </>
      )}
      {permit && (
        <>
          <h3 style={styles.title}>Permit: {permit.address}</h3>
          <Row label="Type" value={permit.permit_type} />
          <Row label="Status" value={permit.status} />
          <Row label="Est. cost" value={permit.estimated_cost ? `$${Number(permit.estimated_cost).toLocaleString()}` : "N/A"} />
          {permit.description && <Row label="Description" value={permit.description} />}
        </>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
      <span style={{ color: "#9aa1b0" }}>{label}</span>
      <span style={{ color: "#eee", marginLeft: 12, textAlign: "right" }}>{value}</span>
    </div>
  );
}

const styles = {
  panel: {
    position: "absolute", top: 16, right: 16, width: 260, background: "#161923ee",
    border: "1px solid #3a3f4b", borderRadius: 10, padding: "14px 16px", zIndex: 60,
    color: "#eee",
  },
  closeBtn: {
    position: "absolute", top: 6, right: 8, background: "none", border: "none",
    color: "#9aa1b0", fontSize: 18, cursor: "pointer",
  },
  title: { margin: "0 18px 8px 0", fontSize: 15 },
};
