import { useState } from "react";

export default function QueryBar({ onRunQuery, lastExplanation, loading }) {
  const [text, setText] = useState("");

  function submit(e) {
    e.preventDefault();
    if (text.trim()) onRunQuery(text.trim());
  }

  return (
    <form onSubmit={submit} style={styles.wrap}>
      <input
        style={styles.input}
        placeholder='Try: "highlight buildings over 100 feet" or "show commercial buildings"'
        value={text}
        onChange={(e) => setText(e.target.value)}
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
    position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
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
