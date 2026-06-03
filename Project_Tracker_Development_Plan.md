# Project Tracker

*Development Plan, Companion to the Fashion Retail Intelligence Platform*

Prepared for Swapnil S Joijode | Version 1.0 | June 2026

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Architecture Decisions](#2-architecture-decisions)
- [3. Technology Stack, Free-Tier Validated](#3-technology-stack-free-tier-validated)
- [4. Data Model](#4-data-model)
- [5. The Migration Template and Integration Pattern](#5-the-migration-template-and-integration-pattern)
- [6. Control Surfaces](#6-control-surfaces)
- [7. Phased Delivery Plan](#7-phased-delivery-plan)
  - [Phase T0. Foundation and Version Control](#phase-t0-foundation-and-version-control)
  - [Phase T1. Data Model and Migration Template Schema](#phase-t1-data-model-and-migration-template-schema)
  - [Phase T2. Datastore and API](#phase-t2-datastore-and-api)
  - [Phase T3. Control Surfaces, Code and Interactive](#phase-t3-control-surfaces-code-and-interactive)
  - [Phase T4. Template Sync Pipeline, Cross-Repo Seeding](#phase-t4-template-sync-pipeline-cross-repo-seeding)
  - [Phase T5. Web Interface and Charts](#phase-t5-web-interface-and-charts)
  - [Phase T6. Export Engine](#phase-t6-export-engine)
  - [Phase T7. Containerization and Multi-Round Replication Testing](#phase-t7-containerization-and-multi-round-replication-testing)
  - [Phase T8. CI/CD and Deployment](#phase-t8-cicd-and-deployment)
  - [Phase T9. Integration With the Retail Project](#phase-t9-integration-with-the-retail-project)
- [8. Export Specification](#8-export-specification)
- [9. Risk Register](#9-risk-register)
- [10. Sequencing and Milestones](#10-sequencing-and-milestones)

---

## 1. Executive Summary

This document defines the development of the Project Tracker, a dedicated application that records the progress of the Fashion Retail Intelligence Platform. It is built first, before the retail project begins, and once live it tracks every task as ongoing, success, or failure, with the full history of changes.

The design separates data from deployment. The tracker is a small application backed by a datastore and an API. A versioned migration template seeds the task list across repositories, and status updates flow through the API. The application is redeployed only when its own code changes, never when a task status changes. This keeps two independent codebases integrated through a contract rather than coupled through shared code or constant rebuilds.

One honest note. A free hosted tool such as GitHub Projects could track this work with far less effort, controlled from both an IDE and a live session, and that option stays open. Building the tracker is a deliberate choice, because a full-stack application with an API, a CLI, two pipelines, container-tested replication, and data and slide exports is itself a portfolio-grade demonstration of engineering range. The discipline is to keep it lean, so it supports the retail project rather than competing with it.

---

## 2. Architecture Decisions

**Separate data from deployment, a correction to the initial brief**

The initial idea tied a tracker update to a redeploy whenever the template changed. That is acceptable for the first seeding of the task list, but the tracker must also record frequent status changes as work proceeds. Redeploying a hosted application for every status change is slow and consumes free hosting build minutes for no benefit. The resolution is to treat the template as a data seed and status changes as data writes, and to redeploy only when the application code itself changes.

**Two repositories, integrated through a contract**

The tracker lives in its own repository, independent of the retail project. The two integrate through a versioned migration template and an API, not through shared code. This is a bounded-context separation: each codebase evolves on its own, and the contract between them is explicit and versioned.

**A dynamic application over a datastore**

The tracker is a dynamic application backed by a free datastore and an API. The interface, the CLI, and the export engine all read and write through that API, so every change is captured once and consistently. No surface touches the datastore directly.

**Free across the board**

Every component sits inside a permanent free tier or is open source. Hosting is the free Vercel tier, the datastore is a free Postgres or Cloudflare D1, and the exports use free client-side libraries.

---

## 3. Technology Stack, Free-Tier Validated

| Layer | Tool | Free status | Role |
| --- | --- | --- | --- |
| Application | Next.js | Free, open source | Interface and serverless API |
| Datastore | Neon Postgres or Cloudflare D1 | Free tier | Persistent tracker state |
| API | Next.js route handlers | Free, open source | Read and write tasks and events |
| CLI | Python click or Node commander | Free, open source | Code and pipeline control surface |
| Charts | Recharts or Chart.js | Free, open source | In-app progress charts |
| Data export | SheetJS | Free, open source | Excel, CSV, and TSV downloads |
| Slide export | PptxGenJS | Free, open source | Slide deck with charts and visuals |
| Containers | Docker, Docker Compose | Free | Reproducible multi-round testing |
| CI/CD | GitLab CI/CD or GitHub Actions | Free tier | App pipeline and template sync pipeline |
| Hosting | Vercel Hobby | Free | Host the tracker |
| Version control | Git on GitLab or GitHub | Free | System of record for the tracker repository |
| Quality gates | Linters, formatters, pre-commit | Free, open source | Code consistency enforcement |

---

## 4. Data Model

The tracker stores tasks and the full history of their status changes. Status is one of ongoing, success, or failure.

| Entity | Grain | Key fields |
| --- | --- | --- |
| project | One row per tracked project | name, repository, template_version |
| phase | One row per phase | project, phase_id, name, order |
| task | One row per task | phase, task_id, title, current_status |
| task_event | One row per status change | task, status, timestamp, note, link to commit or artifact |
| run | One row per pipeline run | project, pipeline, result, timestamp |

A task carries its current status for fast reads. The task_event table carries the complete audit trail, so the tracker can always answer not only what the status is but how it got there.

---

## 5. The Migration Template and Integration Pattern

The migration template is the contract between the project plan and the tracker. It is a versioned file listing every phase and task with stable identifiers, and it is the single source of truth, so tasks are authored once and consumed by both the planning document and the tracker.

**Template shape**

```yaml
# tracker_tasks.yaml   (versioned single source of truth)
version: 1
project: fashion-retail-intelligence
phases:
  - id: P0
    name: Charter and Foundation
    tasks:
      - id: P0-T1
        title: Initialize repository with protected main
      - id: P0-T2
        title: Pin dependencies and commit the lockfile
  - id: P1
    name: Dimensional Model and Metric Dictionary
    tasks:
      - id: P1-T1
        title: State the business questions per mart
```

**Three integration paths**

The design uses three distinct paths, and keeping them distinct is the whole point.

```text
Seeding path:     template change       ->  sync pipeline    ->  upsert tasks   (data only)
Runtime path:     project CI/CD or CLI  ->  tracker API      ->  task_event     (status, data only)
Deployment path:  tracker code change   ->  app pipeline     ->  Vercel deploy  (code only)
```

Seeding and runtime updates change data only. The application is deployed only when its own code changes. A status change never triggers a rebuild.

---

## 6. Control Surfaces

The tracker is controlled two ways, both through the same API, so behavior is identical regardless of surface.

**Code and IDE**

A CLI wraps the API and is the surface for the IDE and the pipeline. It is scriptable and exit-code aware, so a pipeline stage can call it directly.

```bash
tracker task start  P3-T2
tracker task done   P3-T2  --note "bronze load verified"
tracker task fail   P3-T2  --log ingest.log
tracker phase status P3
```

**Interactive**

The same commands are available in a live session, complemented by the web interface, which shows status per phase and the event history and lets a user change status with a click. Both the CLI and the interface write only through the API, so every change is captured as an event.

---

## 7. Phased Delivery Plan

Each phase carries the same structure as the retail project plan: objective, scope, detailed steps, tools, deliverables, watch-outs, a definition of done, and the theory topics it contributes. A phase is not started until the previous definition of done is met.

### Phase T0. Foundation and Version Control

**Objective.** Stand up the tracker repository, environment, quality gates, and Git discipline before any feature work.

**Scope.** Repository, environment, pre-commit hooks, task runner, secrets, a Docker baseline, and Git remote with branch protection.

**Detailed steps**

1. Initialize the tracker repository, separate from the retail project repository. Protect main and work through feature branches and merge requests.
2. Create the environment. For a Next.js tracker, pin Node dependencies and commit the lockfile. Add a CLI environment, managed with uv if the CLI is Python.
3. Add pre-commit with linters and formatters for both the application code and the CLI, so quality is enforced on every commit.
4. Add a Makefile exposing setup, dev, test, seed, sync, and export commands.
5. Establish secrets handling through CI/CD variables and a documented example file. The tracker API token and datastore credentials are declared here, never committed.
6. Adopt commit discipline: conventional commits and a tag per tracker milestone, so the tracker repository is itself a clean version-control example.

**Tools and libraries.** Git, GitLab or GitHub, Node, uv, pre-commit, make, Docker.

**Deliverables**

- Separate initialized repository with protected main
- Green pre-commit run on a clean clone
- Makefile and .env.example

**Watch-outs**

- Keep the two repositories independent. They integrate through an API and a template, not through shared code.
- Declare every secret in CI/CD variables from day one.

**Definition of done.** A fresh clone followed by make setup yields a working environment with passing hooks.

**Theory companion topics added.** repository separation and bounded contexts, conventional commits, branch protection, and why integration through contracts beats shared code.

---

### Phase T1. Data Model and Migration Template Schema

**Objective.** Define the tracker data model and the cross-repo migration template that seeds it.

**Scope.** Entities and relationships, status semantics, and the template schema with its stable identifiers.

**Detailed steps**

1. Model the entities: project, phase, task, task_event, and run. A task_event records a status change to ongoing, success, or failure, with a timestamp, a note, and an optional link to a commit or artifact.
2. Define the migration template: a versioned YAML or JSON file listing every phase and task with stable identifiers. This is the single source of truth and the contract between the project plan and the tracker.
3. Specify idempotent upsert rules keyed on the stable identifiers, so re-running the sync never duplicates tasks and safely applies additions or edits.
4. Fix the history semantics: a task holds current status, while task_event holds the full audit trail of every change.

**Tools and libraries.** A markdown or diagram model, a YAML or JSON schema definition.

**Deliverables**

- Entity model
- Migration template schema
- Documented idempotent upsert rules

**Watch-outs**

- Stable identifiers are sacred. Never reuse or renumber them, or the history breaks.
- Author tasks once in the template. Do not hand-edit the datastore.

**Definition of done.** The template schema is fixed and the upsert rules are documented and agreed.

**Theory companion topics added.** entities and relationships, audit trail vs current state, idempotent upserts, and why a versioned contract decouples two codebases.

---

### Phase T2. Datastore and API

**Objective.** Stand up the persistence layer and the API that reads and writes tracker state.

**Scope.** A free datastore, schema migrations, and API endpoints for tasks, events, and progress summaries.

**Detailed steps**

1. Provision a free datastore. Neon Postgres, Supabase, and Cloudflare D1 all offer permanent free tiers. Apply the T1 schema through migrations.
2. Build API endpoints as serverless route handlers: list and read tasks, create a task_event to set status, and read progress summaries per phase.
3. Protect write endpoints with a token held in CI/CD variables, so only the pipeline and authorized callers can change status.
4. Return progress aggregates that the user interface and the exports will consume.

**Tools and libraries.** Next.js serverless route handlers, Neon Postgres or Cloudflare D1, a migration tool, the API token.

**Deliverables**

- Live datastore with the schema applied
- A working API
- Token-protected write endpoints

**Watch-outs**

- Make the API the only path that writes status, so every change is captured as an event.
- Stay inside free-tier connection limits by pooling connections.

**Definition of done.** The API creates and reads tasks and events against the datastore, with authenticated writes.

**Theory companion topics added.** serverless functions and cold starts, connection pooling on free tiers, REST endpoint design, idempotency keys on writes, and token-based authorization.

---

### Phase T3. Control Surfaces, Code and Interactive

**Objective.** Provide both a code-driven and an interactive control surface, so the tracker is driven from an IDE and from a live session.

**Scope.** A CLI, an interactive mode, and the shared API behind them.

**Detailed steps**

1. Build a CLI that wraps the API. Commands such as task start, task done, task fail with a note, and phase status. This is the IDE and pipeline control surface.
2. Provide an interactive mode: the same commands in a live session, complemented by the web interface built in Phase T5.
3. Make the CLI scriptable and exit-code aware, so the retail project pipeline can call it directly inside a stage.
4. Document every command with examples.

**Tools and libraries.** A CLI framework such as Python click or Node commander, the tracker API.

**Deliverables**

- An installable CLI
- An interactive mode
- Documented commands with examples

**Watch-outs**

- The CLI and the user interface must both go through the API, never the datastore directly, so all writes stay auditable.

**Definition of done.** A task can be moved through ongoing, success, and failure from both the CLI and an interactive session.

**Theory companion topics added.** command line design and exit codes, the value of one API behind many surfaces, and scripting and automation hooks.

---

### Phase T4. Template Sync Pipeline, Cross-Repo Seeding

**Objective.** Automate seeding the tracker from the migration template whenever the template changes.

**Scope.** A sync job, its trigger, and idempotent application of the template.

**Detailed steps**

1. Build a sync job that reads the template and upserts phases and tasks through the API or a migration runner.
2. Trigger it from the repository that owns the template. When the template changes, the pipeline runs the sync. This is data seeding, not an application redeploy.
3. Make the sync idempotent and safe to re-run, reporting created, updated, and unchanged counts.
4. Version the template and record which version last synced.

**Tools and libraries.** GitLab CI/CD or GitHub Actions, the sync job, the tracker API.

**Deliverables**

- A sync pipeline
- A versioned template
- A sync report of created, updated, and unchanged tasks

**Watch-outs**

- This pipeline updates data only. The tracker application is never rebuilt for a content change.
- Keep the seeding pipeline and the deployment pipeline separate.

**Definition of done.** Editing the template and pushing it updates the tracker task list with no duplication and no redeploy.

**Theory companion topics added.** data migrations vs deployments, idempotent sync, event-triggered pipelines, and decoupling content from code.

---

### Phase T5. Web Interface and Charts

**Objective.** Build the interactive tracker interface, branded and uncluttered, with progress charts.

**Scope.** Phase and task views, status controls, and summary charts.

**Detailed steps**

1. Build the application with a view per phase: tasks, current status, and the event history.
2. Provide controls to set status, which call the API.
3. Add summary charts: completion by phase, success and failure counts, and a timeline of events.
4. Design to the same philosophy as the project dashboard: a clear hierarchy, one consistent theme, no duplicate charts, and no needless drillthrough.

**Tools and libraries.** Next.js, Recharts or Chart.js.

**Deliverables**

- A deployed interface
- Status controls wired to the API
- Progress charts per phase

**Watch-outs**

- Keep it simple and decision-led. The tracker shows what is done, what failed, and what is in flight, nothing more.

**Definition of done.** The interface shows live status per phase and lets a user change status through the API.

**Theory companion topics added.** reading from an API in a web application, client and server rendering, chart selection, and information hierarchy.

---

### Phase T6. Export Engine

**Objective.** Make tracker data downloadable as data and as a presentation, once deployed.

**Scope.** Excel, CSV, and TSV exports of the data, and a slide deck with charts and visuals.

**Detailed steps**

1. Data exports: generate Excel, CSV, and TSV from the current tracker state. SheetJS produces all three in the browser at no cost.
2. Presentation export: generate a slide deck that summarizes phase progress with charts and visuals. PptxGenJS builds PowerPoint with native charts in the browser at no cost.
3. Draw every export from the API response, so a download always reflects live state at the moment it is taken.
4. Offer one-click downloads from the interface.

**Tools and libraries.** SheetJS for xlsx, csv, and tsv, PptxGenJS for slides, the tracker API.

**Deliverables**

- Working data exports in three formats
- A generated slide deck with charts
- Download controls in the interface

**Watch-outs**

- Build exports from the API response, so a download always matches what the interface shows.

**Definition of done.** A user downloads Excel, CSV, TSV, and a slide deck that match the live tracker state.

**Theory companion topics added.** client-side file generation, spreadsheet and presentation formats, and building charts into a slide deck programmatically.

---

### Phase T7. Containerization and Multi-Round Replication Testing

**Objective.** Make the tracker reproducible in containers and prove that state replicates perfectly across repeated test rounds.

**Scope.** Dockerfiles, Compose, a seeded test datastore, and a replication test harness.

**Detailed steps**

1. Containerize the application, the CLI, and a test datastore in one Docker Compose stack.
2. Build a replication harness that seeds from a fixed template, drives a set sequence of status changes, exports, resets, and repeats.
3. Assert that every round produces identical task state and identical exports, so replication is exact.
4. Run the harness in CI on a clean container each time.

**Tools and libraries.** Docker, Docker Compose, the test datastore, pytest or a JavaScript test runner.

**Deliverables**

- A Compose stack
- A replication harness
- Passing multi-round replication tests

**Watch-outs**

- Seed from a fixed template and a fixed clock where possible, so rounds are comparable.
- Reset cleanly between rounds to catch state leakage.

**Definition of done.** Repeated rounds in Docker yield identical state and identical exports.

**Theory companion topics added.** environment parity, deterministic tests, fixtures and seeding, and why replication tests catch state leakage.

---

### Phase T8. CI/CD and Deployment

**Objective.** Automate quality and delivery for the tracker, keeping the two pipelines strictly separate.

**Scope.** An application pipeline and the template sync pipeline, plus the Vercel deployment.

**Detailed steps**

1. Application pipeline: lint, test, build, and deploy the tracker to Vercel. This runs only when the tracker code changes.
2. Template sync pipeline, from Phase T4: runs when the template changes and updates data only.
3. Store the tracker API token and datastore credentials as masked CI/CD variables.
4. Gate merges on a green application pipeline.

**Tools and libraries.** GitLab CI/CD or GitHub Actions, Vercel, CI/CD variables.

**Deliverables**

- Two clearly separated pipelines
- A deployed tracker on Vercel
- Merge gates on main

**Watch-outs**

- Never conflate the two pipelines. Code changes deploy; content changes sync. This separation is the core of the design.

**Definition of done.** Code changes deploy the application and template changes sync data, each through its own pipeline.

**Theory companion topics added.** separating deploy from data, pipeline triggers and paths, secrets in CI, and why two focused pipelines beat one overloaded pipeline.

---

### Phase T9. Integration With the Retail Project

**Objective.** Wire the retail project to the live tracker so progress records automatically as that project is built.

**Scope.** Seeding the retail project tasks and emitting status from its pipeline.

**Detailed steps**

1. Seed the tracker from the retail project migration template, the file authored in Phase 0 of the main plan.
2. In the retail project pipeline, call the tracker CLI or API on each stage to record ongoing, success, or failure.
3. Verify the tracker reflects real project progress and that exports summarize it correctly.
4. Hand over: from this point, the tracker is the live record for the retail build.

**Tools and libraries.** The tracker API and CLI, the retail project pipeline, the migration template.

**Deliverables**

- The retail project seeded in the tracker
- Status flowing from the retail pipeline
- Verified exports of project progress

**Watch-outs**

- The project reports to the tracker as data through the API. The two codebases stay independent.

**Definition of done.** Building the retail project updates the tracker automatically, and exports reflect that progress.

**Theory companion topics added.** integration through contracts, push-based status reporting, and keeping codebases decoupled while integrated.

---

## 8. Export Specification

Once deployed, the tracker makes its data downloadable in two registers: data formats for analysis, and a presentation for sharing. Every export reflects live state at the moment of download.

**Data exports**

- Excel, CSV, and TSV, generated client-side with SheetJS from the current task and event data. One workbook with a tasks sheet and an events sheet, plus flat CSV and TSV for quick analysis.

**Presentation export**

- A slide deck built client-side with PptxGenJS: a title slide, a completion-by-phase chart, a success and failure summary chart, and an event timeline. Charts are native to the slide deck, not pasted images.

---

## 9. Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tracker scope exceeds the core project | High | Timebox the tracker; keep it lean; the retail pipeline is the headline asset |
| Cross-repo coupling | Medium | Integrate through the API and a versioned template, not shared code or redeploys |
| Redeploy on data change burns hosting build minutes | Medium | Data flows through the API; only code changes deploy |
| Tracker cannot track its own pre-existence | Low | Track the tracker build through its repository and this plan; it goes live before the retail project |
| Free datastore limits | Low | Small footprint and pooled connections; the tracker stores tasks and events, not bulk data |
| A free tool already does this | Medium | Accepted: building it is a deliberate portfolio showcase of full-stack, API, CI/CD, and exports |

---

## 10. Sequencing and Milestones

The tracker is built first. It must be live, recording status, and exporting before Phase 0 of the retail project begins. The phases are linear and gated, each milestone reached when its definition of done is met.

- TM0 Foundation: separate repository, environment, and quality gates live.
- TM1 Model and template: data model fixed and migration template schema agreed.
- TM2 Datastore and API: persistence and authenticated API live.
- TM3 Control surfaces: CLI and interactive control through the API.
- TM4 Template sync: template changes seed the tracker with no redeploy.
- TM5 Interface and charts: live status per phase with progress charts.
- TM6 Exports: Excel, CSV, TSV, and a slide deck with charts.
- TM7 Replication tested: identical state and exports across rounds in Docker.
- TM8 Deployed: two separate pipelines and the tracker live on Vercel.
- TM9 Integrated: the retail project reports status to the tracker automatically.

Only after TM9 does the retail project Phase 0 begin in earnest, now fully tracked from the first commit.

