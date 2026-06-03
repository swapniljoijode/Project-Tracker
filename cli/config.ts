export function getConfig() {
  const apiUrl = process.env.TRACKER_API_URL ?? "http://localhost:3000";
  const apiToken = process.env.TRACKER_API_TOKEN ?? "";

  if (!apiToken) {
    console.error("Error: TRACKER_API_TOKEN is not set.");
    process.exit(1);
  }

  return { apiUrl, apiToken };
}
