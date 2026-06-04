/**
 * Replication harness — Phase T7.
 *
 * Runs ROUNDS identical cycles of: reset → seed → fixed status sequence → snapshot.
 * Asserts that every round produces the exact same task state and event counts.
 * Proves that seeding and status transitions are deterministic and idempotent.
 *
 * Run locally:  DATABASE_URL=<url> npm test
 * Run in CI:    docker compose run --rm test
 */
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
  createTestDb,
  resetDb,
  seedFromTemplate,
  applyFixedSequence,
  captureSnapshot,
  FIXED_STATUS_SEQUENCE,
  type TaskSnapshot,
} from "./helpers/db";

const ROUNDS = 3;

describe(`Replication harness (${ROUNDS} rounds)`, () => {
  const { pool, db } = createTestDb();
  let baseline: TaskSnapshot[] = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL must be set to run replication tests.");
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  for (let round = 1; round <= ROUNDS; round++) {
    it(`Round ${round}/${ROUNDS}: reset → seed → sequence → snapshot matches baseline`, async () => {
      // ── 1. Reset ────────────────────────────────────────────────────────────
      await resetDb(db);

      const afterReset = await captureSnapshot(db);
      expect(afterReset).toHaveLength(0);

      // ── 2. Seed from template ────────────────────────────────────────────────
      await seedFromTemplate(db);

      const afterSeed = await captureSnapshot(db);
      expect(afterSeed.length).toBeGreaterThan(0);
      // All tasks start as "ongoing" after seeding
      expect(afterSeed.every((t) => t.currentStatus === "ongoing")).toBe(true);
      expect(afterSeed.every((t) => t.eventCount === 0)).toBe(true);

      // ── 3. Apply fixed status sequence ───────────────────────────────────────
      await applyFixedSequence(db);

      const snapshot = await captureSnapshot(db);

      // Tasks touched by the sequence have the expected final status
      const t01 = snapshot.find((t) => t.id === "T0-1")!;
      expect(t01.currentStatus).toBe("success");
      expect(t01.eventCount).toBe(2); // ongoing → success

      const t03 = snapshot.find((t) => t.id === "T0-3")!;
      expect(t03.currentStatus).toBe("failure");
      expect(t03.eventCount).toBe(2); // ongoing → failure

      const t11 = snapshot.find((t) => t.id === "T1-1")!;
      expect(t11.currentStatus).toBe("success");
      expect(t11.eventCount).toBe(2); // ongoing → success

      // Total event count = length of the fixed sequence
      const totalEvents = snapshot.reduce((sum, t) => sum + t.eventCount, 0);
      expect(totalEvents).toBe(FIXED_STATUS_SEQUENCE.length);

      // ── 4. Assert identical state across rounds ───────────────────────────────
      if (round === 1) {
        baseline = snapshot;
      } else {
        expect(snapshot).toEqual(baseline);
      }
    });
  }

  it("sync is idempotent: re-seeding after events does not reset status", async () => {
    await resetDb(db);
    await seedFromTemplate(db);
    await applyFixedSequence(db);

    const beforeReseed = await captureSnapshot(db);
    const t01Before = beforeReseed.find((t) => t.id === "T0-1")!;
    expect(t01Before.currentStatus).toBe("success");

    // Re-run seed — must not overwrite currentStatus
    await seedFromTemplate(db);

    const afterReseed = await captureSnapshot(db);
    const t01After = afterReseed.find((t) => t.id === "T0-1")!;
    expect(t01After.currentStatus).toBe("success");
    expect(t01After.eventCount).toBe(t01Before.eventCount);
  });
});
