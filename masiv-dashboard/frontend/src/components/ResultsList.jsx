import { useMemo, useState } from "react";

const SORT_OPTIONS = [
  { key: "address", label: "Address" },
  { key: "height_m", label: "Height" },
  { key: "assessed_value", label: "Assessed value" },
  { key: "zoning", label: "Zoning" },
];

export default function ResultsList({ buildings, onSelect, selectedId, onClear }) {
  const [sortKey, setSortKey] = useState("height_m");
  const [ascending, setAscending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...buildings];
    copy.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
      return ascending ? cmp : -cmp;
    });
    return copy;
  }, [buildings, sortKey, ascending]);

  if (!buildings || buildings.length === 0) return null;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.count}>{buildings.length}</span>
          <span>matching {buildings.length === 1 ? "building" : "buildings"}</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.iconBtn} onClick={() => setCollapsed(!collapsed)} title={collapsed ? "Expand" : "Collapse"}>
            {collapsed ? "▸" : "▾"}
          </button>
          <button style={styles.iconBtn} onClick={onClear} title="Clear results">×</button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div style={styles.sortRow}>
            <select style={styles.select} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>Sort: {o.label}</option>
              ))}
            </select>
            <button style={styles.sortDirBtn} onClick={() => setAscending(!ascending)} title="Toggle sort direction">
              {ascending ? "↑" : "↓"}
            </button>
          </div>

          <div style={styles.list}>
            {sorted.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelect(b)}
                style={{ ...styles.item, ...(b.id === selectedId ? styles.itemSelected : {}) }}
              >
                <div style={styles.itemAddress}>{b.address}</div>
                <div style={styles.itemMeta}>
                  <span>{b.height_m.toFixed(0)} m</span>
                  <span>{b.zoning}</span>
                  <span>${Number(b.assessed_value).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    position: "absolute", top: 200, left: 16, zIndex: 45, width: 300,
    maxHeight: "min(55vh, 460px)", background: "#161923ee", border: "1px solid #3a3f4b",
    borderRadius: 10, color: "#eee", display: "flex", flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 12px", borderBottom: "1px solid #262b38", fontSize: 13,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  count: {
    background: "#4a7dfc", color: "white", borderRadius: 999, padding: "1px 8px",
    fontSize: 12, fontWeight: 700,
  },
  headerRight: { display: "flex", gap: 4 },
  iconBtn: {
    background: "none", border: "none", color: "#9aa1b0", fontSize: 15,
    cursor: "pointer", padding: "2px 6px", lineHeight: 1,
  },
  sortRow: {
    display: "flex", gap: 6, padding: "8px 12px", borderBottom: "1px solid #262b38",
  },
  select: {
    flex: 1, fontSize: 12, background: "#0f1117", color: "#eee",
    border: "1px solid #3a3f4b", borderRadius: 6, padding: "4px 6px",
  },
  sortDirBtn: {
    width: 30, background: "#0f1117", color: "#eee", border: "1px solid #3a3f4b",
    borderRadius: 6, cursor: "pointer",
  },
  list: { overflowY: "auto", padding: "4px 0" },
  item: {
    padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #1e222c",
  },
  itemSelected: { background: "#22283a" },
  itemAddress: { fontSize: 13, fontWeight: 600, marginBottom: 3 },
  itemMeta: {
    display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9aa1b0",
    gap: 6,
  },
};
