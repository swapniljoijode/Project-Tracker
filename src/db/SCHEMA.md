# Data Model

## Entities

| Table        | Grain                                   | Primary key                              |
| ------------ | --------------------------------------- | ---------------------------------------- |
| `project`    | One row per tracked project             | `id` — short slug e.g. `project-tracker` |
| `phase`      | One row per phase within a project      | `id` — stable phase code e.g. `T0`       |
| `task`       | One row per task                        | `id` — stable task code e.g. `T0-1`      |
| `task_event` | One row per status change (append-only) | `id` — caller-supplied idempotency key   |
| `run`        | One row per pipeline execution          | `id` — caller-supplied idempotency key   |

## Status semantics

A task's `current_status` is one of three values: `ongoing`, `success`, or `failure`.

- `ongoing` is the initial state set when a task is seeded.
- Transitions are recorded by inserting a `task_event` row and updating `task.current_status` atomically in a transaction.
- `task_event` rows are never deleted or updated. They are the complete, ordered audit trail.

## Idempotent upsert rules

The sync pipeline reads `tracker_tasks.yaml` and upserts into `project`, `phase`, and `task` using these rules. Re-running the sync is always safe.

### project

- Key: `id`
- On conflict: update `name`, `repository`, `template_version`. Never touch `created_at`.

### phase

- Key: `id`
- On conflict: update `name`, `order`. Never touch `project_id` or `created_at`.

### task

- Key: `id`
- On conflict: update `title` only. **Never overwrite `current_status`** — status is owned by the runtime path, not the seeding path. `updated_at` is refreshed on every upsert.

### task_event

- Key: `id` (caller-supplied idempotency key, typically `{taskId}-{timestamp}-{random}`)
- On conflict: **do nothing** — an event is immutable once written.

### Stable identifier contract

- Phase and task `id` values are set once in `tracker_tasks.yaml` and never reused or renumbered.
- Deleting a task from the template does **not** delete it from the datastore — the sync only adds and updates.
- To retire a task, mark it `failure` through the runtime path and add a note explaining the retirement.

## Three integration paths (summary)

```
Seeding path:     tracker_tasks.yaml change → sync pipeline → upsert project/phase/task   (data only)
Runtime path:     CLI or web UI              → tracker API  → insert task_event            (data only)
Deployment path:  tracker code change        → app pipeline → Vercel deploy                (code only)
```

Status changes never trigger a redeploy. Template changes never trigger a redeploy.
Only tracker application code changes trigger a redeploy.
