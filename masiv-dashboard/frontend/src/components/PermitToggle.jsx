export default function PermitToggle({ showPermits, setShowPermits }) {
  return (
    <label style={styles.wrap}>
      <input type="checkbox" checked={showPermits} onChange={(e) => setShowPermits(e.target.checked)} />
      Show live building permits
    </label>
  );
}

const styles = {
  wrap: {
    position: "absolute", bottom: 96, right: 16, zIndex: 45, background: "#161923ee",
    border: "1px solid #3a3f4b", borderRadius: 10, padding: "8px 14px", color: "#eee",
    fontSize: 12, display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
  },
};
