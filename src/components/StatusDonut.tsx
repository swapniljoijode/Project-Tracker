"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface Props {
  ongoing: number;
  success: number;
  failure: number;
}

const SLICES = [
  { key: "success", label: "Success", color: "#22c55e" },
  { key: "failure", label: "Failure", color: "#ef4444" },
  { key: "ongoing", label: "Ongoing", color: "#3b82f6" },
];

export function StatusDonut({ ongoing, success, failure }: Props) {
  const values: Record<string, number> = { ongoing, success, failure };
  const data = SLICES.map((s) => ({ name: s.label, value: values[s.key], color: s.color })).filter(
    (d) => d.value > 0
  );

  if (data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#444",
        }}
      >
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8 }}
          formatter={(_v, name, entry) => [`${entry.payload.value} tasks`, name]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: "#888", fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
