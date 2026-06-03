"use server";

import { db, tasks, taskEvents } from "@/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import type { TaskStatus } from "@/lib/types";

export async function setTaskStatus(
  taskId: string,
  status: TaskStatus,
  note?: string,
  artifactLink?: string
) {
  await db.transaction(async (tx) => {
    await tx.insert(taskEvents).values({
      id: randomUUID(),
      taskId,
      status,
      note: note ?? null,
      artifactLink: artifactLink ?? null,
    });
    await tx
      .update(tasks)
      .set({ currentStatus: status, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  });

  const phaseId = taskId.split("-")[0];
  revalidatePath("/");
  revalidatePath(`/phases/${phaseId}`);
}
