"use client";

import { useState } from "react";
import type { ProjectProgress } from "@/lib/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string, mime: string) {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

async function fetchProgress(): Promise<ProjectProgress> {
  const res = await fetch("/api/progress");
  if (!res.ok) throw new Error("Failed to fetch progress");
  return res.json();
}

async function fetchTasks() {
  const res = await fetch("/api/tasks");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json() as Promise<
    Array<{
      id: string;
      phaseId: string;
      phaseName: string;
      title: string;
      currentStatus: string;
      updatedAt: string;
    }>
  >;
}

async function exportSpreadsheet(format: "xlsx" | "csv" | "tsv") {
  const [progress, tasks] = await Promise.all([fetchProgress(), fetchTasks()]);
  const XLSX = await import("xlsx");

  const phaseRows = progress.phases.map((p) => ({
    ID: p.id,
    Name: p.name,
    Total: p.total,
    Success: p.success,
    Failure: p.failure,
    Ongoing: p.ongoing,
    "Completion %": p.total > 0 ? Math.round((p.success / p.total) * 100) : 0,
  }));

  const taskRows = tasks.map((t) => ({
    ID: t.id,
    Phase: t.phaseId,
    "Phase Name": t.phaseName,
    Title: t.title,
    Status: t.currentStatus,
    "Last Updated": new Date(t.updatedAt).toLocaleString(),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(phaseRows), "Phases");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), "Tasks");

  const date = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    XLSX.writeFile(wb, `project-tracker-${date}.xlsx`);
  } else if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(taskRows));
    downloadText(csv, `project-tracker-tasks-${date}.csv`, "text/csv");
  } else {
    const tsv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(taskRows), { FS: "\t" });
    downloadText(tsv, `project-tracker-tasks-${date}.tsv`, "text/tab-separated-values");
  }
}

async function exportPptx() {
  const progress = await fetchProgress();
  const { default: pptxgen } = await import("pptxgenjs");
  const pptx = new pptxgen();

  const DATE = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const totals = progress.totals;
  const overallPct = totals.total > 0 ? Math.round((totals.success / totals.total) * 100) : 0;

  // ── Slide 1: Title ──────────────────────────────────────────────────────────
  const s1 = pptx.addSlide();
  s1.background = { color: "0a0a0a" };
  s1.addText("Project Tracker", {
    x: 0.8,
    y: 1.8,
    w: 8,
    h: 1,
    fontSize: 36,
    bold: true,
    color: "ededed",
  });
  s1.addText("Fashion Retail Intelligence Platform — Build Progress", {
    x: 0.8,
    y: 2.9,
    w: 8,
    h: 0.5,
    fontSize: 16,
    color: "888888",
  });
  s1.addText(DATE, { x: 0.8, y: 3.6, w: 8, h: 0.4, fontSize: 13, color: "555555" });

  // ── Slide 2: Overall progress ────────────────────────────────────────────────
  const s2 = pptx.addSlide();
  s2.background = { color: "0a0a0a" };
  s2.addText("Overall Progress", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: "ededed",
  });
  s2.addText(`${overallPct}%`, {
    x: 0.5,
    y: 1.1,
    w: 4,
    h: 1.4,
    fontSize: 72,
    bold: true,
    color: "22c55e",
  });
  s2.addText(
    `${totals.success} done  ·  ${totals.failure} failed  ·  ${totals.ongoing} in progress  ·  ${totals.total} total`,
    {
      x: 0.5,
      y: 2.6,
      w: 9,
      h: 0.4,
      fontSize: 13,
      color: "888888",
    }
  );

  // ── Slide 3: Completion by phase (native bar chart) ──────────────────────────
  const s3 = pptx.addSlide();
  s3.background = { color: "0a0a0a" };
  s3.addText("Completion by Phase", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: "ededed",
  });

  const chartData = [
    {
      name: "Complete %",
      labels: progress.phases.map((p) => p.id),
      values: progress.phases.map((p) =>
        p.total > 0 ? Math.round((p.success / p.total) * 100) : 0
      ),
    },
  ];

  s3.addChart(pptx.ChartType.bar, chartData, {
    x: 0.5,
    y: 0.9,
    w: 9,
    h: 4.2,
    barDir: "col",
    chartColors: ["3b82f6"],
    valAxisMaxVal: 100,
    showValue: true,
    dataLabelFontSize: 10,
    dataLabelColor: "888888",
  });

  // ── Slide 4: Status breakdown (native pie chart) ─────────────────────────────
  const s4 = pptx.addSlide();
  s4.background = { color: "0a0a0a" };
  s4.addText("Status Breakdown", {
    x: 0.5,
    y: 0.3,
    w: 9,
    h: 0.5,
    fontSize: 18,
    bold: true,
    color: "ededed",
  });

  const pieData = [
    {
      name: "Status",
      labels: ["Success", "Failure", "Ongoing"],
      values: [totals.success, totals.failure, totals.ongoing],
    },
  ];

  s4.addChart(pptx.ChartType.pie, pieData, {
    x: 1.5,
    y: 0.9,
    w: 7,
    h: 4.2,
    chartColors: ["22c55e", "ef4444", "3b82f6"],
    showPercent: true,
    dataLabelFontSize: 12,
    legendPos: "b",
  });

  const date = new Date().toISOString().slice(0, 10);
  await pptx.writeFile({ fileName: `project-tracker-${date}.pptx` });
}

const EXPORT_BUTTONS: {
  key: string;
  label: string;
  desc: string;
  action: () => Promise<void>;
}[] = [
  { key: "xlsx", label: "Excel", desc: ".xlsx", action: () => exportSpreadsheet("xlsx") },
  { key: "csv", label: "CSV", desc: ".csv", action: () => exportSpreadsheet("csv") },
  { key: "tsv", label: "TSV", desc: ".tsv", action: () => exportSpreadsheet("tsv") },
  { key: "pptx", label: "Slides", desc: ".pptx", action: exportPptx },
];

export function ExportButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(key: string, action: () => Promise<void>) {
    setLoading(key);
    try {
      await action();
    } catch (e) {
      console.error("Export failed", e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {EXPORT_BUTTONS.map(({ key, label, desc, action }) => (
        <button
          key={key}
          disabled={loading !== null}
          onClick={() => handle(key, action)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: loading !== null ? "wait" : "pointer",
            background: loading === key ? "#1e3a1e" : "#111",
            border: "1px solid #333",
            color: loading === key ? "#22c55e" : "#aaa",
            transition: "all 0.15s",
          }}
        >
          {loading === key ? "⟳ Generating…" : `↓ ${label}`}
          <span style={{ fontSize: 11, color: "#555" }}>{desc}</span>
        </button>
      ))}
    </div>
  );
}
