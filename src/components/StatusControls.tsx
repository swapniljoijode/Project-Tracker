"use client";

import { useTransition } from "react";
import { setTaskStatus } from "@/app/actions";
import type { TaskStatus } from "@/lib/types";

const BUTTONS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "ongoing", label: "Start", color: "#3b82f6" },
  { status: "success", label: "Done", color: "#22c55e" },
  { status: "failure", label: "Fail", color: "#ef4444" },
];

export function StatusControls({ taskId, current }: { taskId: string; current: TaskStatus }) {
  const [pending, startTransition] = useTransition();

  function handle(status: TaskStatus) {
    startTransition(() => {
      setTaskStatus(taskId, status);
    });
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      {BUTTONS.map(({ status, label, color }) => (
        <button
          key={status}
          disabled={pending || current === status}
          onClick={() => handle(status)}
          style={{
            padding: "3px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: current === status || pending ? "default" : "pointer",
            border: `1px solid ${color}55`,
            background: current === status ? `${color}33` : "transparent",
            color: current === status ? color : "#888",
            opacity: pending ? 0.5 : 1,
            transition: "all 0.15s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
