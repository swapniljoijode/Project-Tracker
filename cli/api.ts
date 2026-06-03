import type { TaskStatus } from "../src/lib/types";

interface ApiOptions {
  apiUrl: string;
  apiToken: string;
}

async function request<T>(
  opts: ApiOptions,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const url = `${opts.apiUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tracker-token": opts.apiToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    console.error(`API error ${res.status}: ${text}`);
    process.exit(1);
  }

  return res.json() as Promise<T>;
}

export interface TaskDetail {
  id: string;
  phaseId: string;
  phaseName: string;
  title: string;
  currentStatus: TaskStatus;
  updatedAt: string;
  events: Array<{
    id: string;
    status: TaskStatus;
    note: string | null;
    artifactLink: string | null;
    createdAt: string;
  }>;
}

export interface PhaseRow {
  id: string;
  name: string;
  order: number;
  total: number;
  ongoing: number;
  success: number;
  failure: number;
}

export function getTask(opts: ApiOptions, id: string): Promise<TaskDetail> {
  return request<TaskDetail>(opts, "GET", `/api/tasks/${id}`);
}

export function createEvent(
  opts: ApiOptions,
  taskId: string,
  status: TaskStatus,
  note?: string,
  artifactLink?: string
): Promise<{ eventId: string; taskId: string; status: string }> {
  return request(opts, "POST", `/api/tasks/${taskId}/events`, {
    status,
    note,
    artifactLink,
  });
}

export function getPhases(opts: ApiOptions, projectId?: string): Promise<PhaseRow[]> {
  const qs = projectId ? `?projectId=${projectId}` : "";
  return request<PhaseRow[]>(opts, "GET", `/api/phases${qs}`);
}
