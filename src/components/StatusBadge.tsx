import type { TaskStatus } from "@/lib/types";

const CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  ongoing: { label: "Ongoing", color: "#3b82f6" },
  success: { label: "Success", color: "#22c55e" },
  failure: { label: "Failure", color: "#ef4444" },
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, color } = CONFIG[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}
