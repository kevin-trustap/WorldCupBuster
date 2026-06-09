import { useState, useCallback } from "react";

const METRICS = [
  {
    key: "points", label: "Points earned", min: 0, max: 9, step: 1,
    compute: v => (9 - v) * 3,
    display: v => `${v} pts`,
    hint: "(9 − pts) × 3",
    desc: "Fewer points = more shame",
    icon: "🏆",
  },
  {
    key: "conceded", label: "Goals conceded", min: 0, max: 20, step: 1,
    compute: v => v * 2,
    display: v => `${v}`,
    hint: "goals × 2",
    desc: "Raw goals let in",
    icon: "🥅",
  },
  {
    key: "gd", label: "Goal difference", min: -15, max: 10, step: 1,
    compute: v => v < 0 ? Math.abs(v) * 1.5 : 0,
    display: v => v >= 0 ? `+${v}` : `${v}`,
    hint: "|neg GD| × 1.5",
    desc: "Only negative GD scores",
    icon: "📉",
  },
  {
    key: "yellows", label: "Yellow cards", min: 0, max: 20, step: 1,
    compute: v => v,
    display: v => `${v}`,
    hint: "count × 1",
    desc: "",
    icon: "🟨",
  },
  {
    key: "reds", label: "Red cards", min: 0, max: 6, step: 1,
    compute: v => v * 3,
    display: v => `${v}`,
    hint: "count × 3",
    desc: "",
    icon: "🟥",
  },
  {
    key: "bigdefeat", label: "Biggest single defeat", min: 0, max: 10, step: 1,
    compute: v => v * 2,
    display: v => v === 0 ? "None" : `by ${v}`,
    hint: "margin × 2",
    desc: "Worst single-match margin",
    icon: "💥",
  },
  {
    key: "og", label: "Own goals", min: 0, max: 8, step: 1,
    compute: v => v * 4,
    display: v => `${v}`,
    hint: "count × 4",
    desc: "Pure self-sabotage premium",
    icon: "😬",
  },
  {
    key: "fastgoal", label: "Fastest goal conceded", min: 1, max: 90, step: 1,
    compute: v => Math.round((90 - v) * 0.3 * 10) / 10,
    display: v => `min ${v}`,
    hint: "(90 − min) × 0.3",
    desc: "Earlier = more points",
    icon: "⚡",
  },
  {
    key: "penmiss", label: "Failed penalties", min: 0, max: 5, step: 1,
    compute: v => v * 3,
    display: v => `${v}`,
    hint: "count × 3",
    desc: "Misses + saved attempts",
    icon: "🎯",
  },
];

const COLORS = [
  "#378ADD", "#1D9E75", "#D85A30", "#D4537E",
  "#639922", "#BA7517", "#534AB7", "#888780",
];

const DEFAULT_TEAMS = [
  { name: "Team A", points: 3, conceded: 9, gd: -5, yellows: 7, reds: 1, bigdefeat: 3, og: 1, fastgoal: 4,  penmiss: 1 },
  { name: "Team B", points: 6, conceded: 4, gd:  2, yellows: 3, reds: 0, bigdefeat: 1, og: 0, fastgoal: 22, penmiss: 0 },
  { name: "Team C", points: 1, conceded: 12,gd: -9, yellows: 9, reds: 2, bigdefeat: 5, og: 3, fastgoal: 2,  penmiss: 2 },
];

function teamWSI(team) {
  return Math.round(METRICS.reduce((sum, m) => sum + m.compute(team[m.key]), 0) * 10) / 10;
}

function MetricCard({ metric, value, onChange }) {
  const pts = metric.compute(value);
  return (
    <div style={{
      background: "rgba(0,0,0,0.03)",
      borderRadius: 10,
      padding: "12px 14px",
      border: "0.5px solid rgba(0,0,0,0.08)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          {metric.icon} {metric.label}
        </span>
        <span style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>{metric.hint}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, margin: "4px 0 6px", color: pts > 0 ? "#c0392b" : "#2ecc71" }}>
        {metric.display(value)}
      </div>
      <input
        type="range"
        min={metric.min}
        max={metric.max}
        step={metric.step}
        value={value}
        onChange={e => onChange(metric.key, parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#c0392b" }}
      />
      <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
        <span style={{ fontWeight: 600, color: "#c0392b" }}>+{pts.toFixed(1)} WSI</span>
        {metric.desc && <span>  ·  {metric.desc}</span>}
      </div>
    </div>
  );
}

export default function WoodenSpoonIndex() {
  const [teams, setTeams] = useState(DEFAULT_TEAMS);
  const [current, setCurrent] = useState(0);
  const [editingName, setEditingName] = useState(false);

  const updateMetric = useCallback((key, val) => {
    setTeams(prev => prev.map((t, i) => i === current ? { ...t, [key]: val } : t));
  }, [current]);

  const updateName = useCallback((name) => {
    setTeams(prev => prev.map((t, i) => i === current ? { ...t, name } : t));
  }, [current]);

  const addTeam = () => {
    if (teams.length >= 8) return;
    const newTeam = { name: `Team ${String.fromCharCode(65 + teams.length)}`, points: 3, conceded: 5, gd: -1, yellows: 4, reds: 0, bigdefeat: 2, og: 0, fastgoal: 35, penmiss: 0 };
    setTeams(prev => [...prev, newTeam]);
    setCurrent(teams.length);
  };

  const removeTeam = () => {
    if (teams.length <= 2) return;
    setTeams(prev => prev.filter((_, i) => i !== current));
    setCurrent(c => Math.min(c, teams.length - 2));
  };

  const scored = [...teams.map((t, i) => ({ ...t, score: teamWSI(t), color: COLORS[i % COLORS.length], idx: i }))]
    .sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...scored.map(s => s.score), 1);
  const team = teams[current];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 700, margin: "0 auto", padding: "20px 16px", color: "#1a1a1a" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🥄</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.5px" }}>Wooden Spoon Index</h1>
        <p style={{ fontSize: 13, color: "#888", margin: 0 }}>FIFA World Cup 2026 · Who played the worst football?</p>
      </div>

      {/* Leaderboard */}
      <div style={{ background: "#fff", border: "0.5px solid rgba(0,0,0,0.1)", borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Leaderboard</div>
        {scored.map((s, rank) => {
          const pct = Math.round(s.score / maxScore * 100);
          const isWorst = rank === 0;
          return (
            <div key={s.idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: rank < scored.length - 1 ? "0.5px solid rgba(0,0,0,0.06)" : "none" }}>
              <span style={{ fontSize: 13, minWidth: 100, fontWeight: isWorst ? 600 : 400, display: "flex", alignItems: "center", gap: 6 }}>
                {isWorst && <span style={{ fontSize: 11, background: "#fdecea", color: "#c0392b", borderRadius: 99, padding: "1px 7px", fontWeight: 600 }}>🥄 spoon</span>}
                {!isWorst && s.name}
              </span>
              {isWorst && <span style={{ fontSize: 13, fontWeight: 600, minWidth: 60 }}>{s.name}</span>}
              <div style={{ flex: 1, height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: s.color, borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              <span style={{ fontSize: isWorst ? 18 : 14, fontWeight: isWorst ? 600 : 400, minWidth: 44, textAlign: "right", color: isWorst ? "#c0392b" : "#888" }}>
                {s.score.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Team selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {teams.map((t, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 8,
              border: i === current ? "1.5px solid #378ADD" : "0.5px solid rgba(0,0,0,0.15)",
              background: i === current ? "#e8f3fd" : "transparent",
              color: i === current ? "#185FA5" : "#555",
              fontWeight: i === current ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {t.name}
          </button>
        ))}
        <button onClick={addTeam} disabled={teams.length >= 8} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8, border: "0.5px dashed rgba(0,0,0,0.2)", background: "transparent", color: "#888", cursor: "pointer" }}>
          + Add team
        </button>
      </div>

      {/* Team name + remove */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          value={team.name}
          maxLength={22}
          onChange={e => updateName(e.target.value)}
          style={{ fontSize: 16, fontWeight: 600, border: "0.5px solid rgba(0,0,0,0.15)", borderRadius: 8, padding: "6px 10px", width: 180, background: "#fff", color: "#1a1a1a" }}
        />
        <span style={{ fontSize: 13, color: "#aaa" }}>WSI total:</span>
        <span style={{ fontSize: 20, fontWeight: 700, color: "#c0392b" }}>{teamWSI(team).toFixed(1)}</span>
        {teams.length > 2 && (
          <button onClick={removeTeam} style={{ marginLeft: "auto", fontSize: 12, color: "#c0392b", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
            Remove team
          </button>
        )}
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
        {METRICS.map(m => (
          <MetricCard key={m.key} metric={m} value={team[m.key]} onChange={updateMetric} />
        ))}
      </div>

      <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 24 }}>
        WSI = Wooden Spoon Index · Higher score = worse football · Updated live
      </p>
    </div>
  );
}
