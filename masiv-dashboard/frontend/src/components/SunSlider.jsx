export default function SunSlider({ value, onChange }) {
  return (
    <div style={styles.wrap}>
      <span style={styles.label}>☀ Time of day</span>
      <input
        type="range" min="0" max="1" step="0.01" value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: 160 }}
      />
    </div>
  );
}

const styles = {
  wrap: {
    position: "absolute", bottom: 16, right: 16, zIndex: 10, background: "#161923ee",
    border: "1px solid #3a3f4b", borderRadius: 10, padding: "10px 14px",
    display: "flex", flexDirection: "column", gap: 6, color: "#eee", fontSize: 12,
  },
  label: { color: "#9aa1b0" },
};
