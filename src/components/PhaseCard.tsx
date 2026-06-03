import Link from "next/link";
import type { PhaseProgress } from "@/lib/types";

export function PhaseCard({ phase }: { phase: PhaseProgress }) {
  const pct = phase.total > 0 ? Math.round((phase.success / phase.total) * 100) : 0;

  return (
    <Link
      href={`/phases/${phase.id}`}
      style={{
        display: "block",
        background: "#111",
        border: "1px solid #222",
        borderRadius: 10,
        padding: "16px 20px",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{phase.name}</span>
        <span style={{ fontSize: 12, color: "#666" }}>{phase.id}</span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          marginTop: 10,
          height: 4,
          background: "#222",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "#22c55e",
            borderRadius: 99,
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Counts */}
      <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 12, color: "#666" }}>
        <span style={{ color: "#22c55e" }}>✓ {phase.success}</span>
        <span style={{ color: "#ef4444" }}>✗ {phase.failure}</span>
        <span style={{ color: "#3b82f6" }}>● {phase.ongoing}</span>
        <span style={{ marginLeft: "auto" }}>{pct}%</span>
      </div>
    </Link>
  );
}
