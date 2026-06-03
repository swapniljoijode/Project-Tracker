CREATE TYPE "public"."pipeline_result" AS ENUM('success', 'failure');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('ongoing', 'success', 'failure');--> statement-breakpoint
CREATE TABLE "phase" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"repository" text NOT NULL,
	"template_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"pipeline" text NOT NULL,
	"result" "pipeline_result" NOT NULL,
	"triggered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_event" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"status" "task_status" NOT NULL,
	"note" text,
	"artifact_link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
	"id" text PRIMARY KEY NOT NULL,
	"phase_id" text NOT NULL,
	"title" text NOT NULL,
	"current_status" "task_status" DEFAULT 'ongoing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "phase" ADD CONSTRAINT "phase_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run" ADD CONSTRAINT "run_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_event" ADD CONSTRAINT "task_event_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_phase_id_phase_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phase"("id") ON DELETE cascade ON UPDATE no action;
