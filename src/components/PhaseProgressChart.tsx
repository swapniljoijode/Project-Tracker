"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from "recharts";
import type { PhaseProgress } from "@/lib/types";

interface Props {
  phases: PhaseProgress[];
}

interface BarEntry {
  name: string;
  pct: number;
  fill: string;
  success: number;
  total: number;
}

export function PhaseProgressChart({ phases }: Props) {
  const data: BarEntry[] = phases.map((p) => {
    const pct = p.total > 0 ? Math.round((p.success / p.total) * 100) : 0;
    return {
      name: p.id,
      pct,
      fill: pct === 100 ? "#22c55e" : pct > 0 ? "#3b82f6" : "#333",
      success: p.success,
      total: p.total,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 16, right: 8, left: -24, bottom: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: "#666", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "#666", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          unit="%"
        />
        <Tooltip
          cursor={{ fill: "#ffffff08" }}
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#aaa" }}
          formatter={(_v, _n, props) => {
            const p = (props as { payload?: BarEntry }).payload;
            return [`${p?.pct ?? 0}% (${p?.success ?? 0}/${p?.total ?? 0})`, "Complete"];
          }}
        />
        <Bar
          dataKey="pct"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          fill="#333"
          isAnimationActive={false}
        >
          <LabelList
            dataKey="pct"
            position="top"
            formatter={(v) => (v != null && v !== false && Number(v) > 0 ? `${v}%` : "")}
            style={{ fill: "#666", fontSize: 10 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
