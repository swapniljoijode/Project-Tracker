/**
 * seed-retail.ts — called from the retail project's pipeline to register
 * the Fashion Retail Intelligence Platform in the tracker and seed its phases
 * and tasks via POST /api/sync.
 *
 * Usage (from the retail project pipeline):
 *   TRACKER_API_URL=https://project-tracker.vercel.app \
 *   TRACKER_API_TOKEN=<token> \
 *   npx tsx scripts/seed-retail.ts retail_tasks.yaml
 *
 * The retail_tasks.yaml must follow the same schema as tracker_tasks.yaml.
 */
import { readFileSync } from "fs";
import { parse } from "yaml";

async function main() {
  const templatePath = process.argv[2];
  if (!templatePath) {
    console.error("Usage: seed-retail.ts <path-to-retail-tasks.yaml>");
    process.exit(1);
  }

  const apiUrl = process.env.TRACKER_API_URL;
  const apiToken = process.env.TRACKER_API_TOKEN;

  if (!apiUrl || !apiToken) {
    console.error("TRACKER_API_URL and TRACKER_API_TOKEN must be set.");
    process.exit(1);
  }

  const raw = readFileSync(templatePath, "utf8");
  const template = parse(raw);

  console.log(`\nSeeding retail project "${template.project}" into tracker at ${apiUrl}\n`);

  // Register the project
  const projRes = await fetch(`${apiUrl}/api/projects`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tracker-token": apiToken },
    body: JSON.stringify({
      id: template.project,
      name: "Fashion Retail Intelligence Platform",
      repository: "https://github.com/swapniljoijode/fashion-retail-intelligence",
      templateVersion: template.version,
    }),
  });

  if (!projRes.ok) {
    console.error(`Failed to register project: ${await projRes.text()}`);
    process.exit(1);
  }
  console.log(`  ✓ project registered: ${template.project}`);

  // Sync phases and tasks
  const syncRes = await fetch(`${apiUrl}/api/sync`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tracker-token": apiToken },
    body: JSON.stringify(template),
  });

  if (!syncRes.ok) {
    console.error(`Failed to sync template: ${await syncRes.text()}`);
    process.exit(1);
  }

  const report = await syncRes.json();
  console.log(
    `  ✓ phases  : ${report.phases.created} created, ${report.phases.updated} updated, ${report.phases.unchanged} unchanged`
  );
  console.log(
    `  ✓ tasks   : ${report.tasks.created} created, ${report.tasks.updated} updated, ${report.tasks.unchanged} unchanged`
  );
  console.log(`\n✓ Retail project seeded (template v${template.version})\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
