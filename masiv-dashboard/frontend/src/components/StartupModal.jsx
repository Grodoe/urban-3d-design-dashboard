import React from "react";

export default function StartupModal({ onClose }) {
  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Controls</h3>
        <ul style={{ margin: "8px 0 12px 18px", color: "#dfe6ef" }}>
          <li>W / S: move forward / back</li>
          <li>A / D: strafe left / right</li>
          <li>Space: move up, C: move down</li>
          <li>Hold Shift for speed boost</li>
          <li>Mouse drag: orbit, Scroll: zoom</li>
        </ul>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => { try { localStorage.setItem("masiv_controls_seen", "1"); } catch {} onClose(); }} style={button}>Got it</button>
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed", left: 0, top: 0, right: 0, bottom: 0,
  background: "rgba(2,6,12,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999,
};
const box = {
  background: "#0f1720", color: "#eef3f8", padding: 20, borderRadius: 10, width: 380,
  border: "1px solid #2b3440", boxShadow: "0 6px 24px rgba(0,0,0,0.6)",
};
const button = {
  background: "#4a7dfc", color: "white", border: "none", padding: "8px 12px", borderRadius: 6, cursor: "pointer",
};
