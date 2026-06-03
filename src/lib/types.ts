export type TaskStatus = "ongoing" | "success" | "failure";

export interface TaskEventPayload {
  status: TaskStatus;
  note?: string;
  artifactLink?: string;
  idempotencyKey?: string;
}

export interface PhaseProgress {
  id: string;
  name: string;
  order: number;
  total: number;
  ongoing: number;
  success: number;
  failure: number;
}

export interface ProjectProgress {
  projectId: string;
  templateVersion: number;
  phases: PhaseProgress[];
  totals: {
    total: number;
    ongoing: number;
    success: number;
    failure: number;
  };
}
