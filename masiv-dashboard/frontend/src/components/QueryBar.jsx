import { useState, useEffect } from "react";

export default function QueryBar({ onRunQuery, onClear, lastExplanation, loading }) {
  const [text, setText] = useState("");
  const [narrow, setNarrow] = useState(() => {
    try { return window.innerWidth < 720; } catch { return false; }
  });

  useEffect(() => {
    function onResize() { setNarrow(window.innerWidth < 720); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function submit(e) {
    e.preventDefault();
    if (text.trim()) onRunQuery(text.trim());
    else if (onClear) onClear();
  }

  const wrapStyle = { ...styles.wrap, top: narrow ? 84 : 16, zIndex: 40 };

  return (
    <form onSubmit={submit} style={wrapStyle}>
      <input
        style={styles.input}
        placeholder='Try: "highlight buildings over 100 feet" or "show commercial buildings"'
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (!next.trim() && onClear) onClear();
        }}
      />
      <button style={styles.button} type="submit" disabled={loading}>
        {loading ? "Thinking..." : "Ask"}
      </button>
      {lastExplanation && <div style={styles.explanation}>{lastExplanation}</div>}
    </form>
  );
}

const styles = {
  wrap: {
    position: "absolute", left: "50%", transform: "translateX(-50%)",
    display: "flex", gap: 8, zIndex: 10, width: "min(640px, 90vw)", flexWrap: "wrap",
  },
  input: {
    flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #3a3f4b",
    background: "#161923", color: "#eee", fontSize: 14, minWidth: 240,
  },
  button: {
    padding: "10px 18px", borderRadius: 8, border: "none", background: "#4a7dfc",
    color: "white", fontWeight: 600, cursor: "pointer",
  },
  explanation: {
    width: "100%", fontSize: 12, color: "#c9cdd6", background: "#161923cc",
    padding: "6px 10px", borderRadius: 6, marginTop: 4,
  },
};
