import type { Config } from "./config.js";
import type { Task } from "./types.js";

// Modeled on the request() helper in packages/worker/scripts/smoke-prod.mjs.
export async function listTasks(config: Config): Promise<Task[]> {
  const response = await fetch(`${config.baseUrl}/api/tasks?limit=100`, {
    headers: {
      authorization: `Bearer ${config.apiKey}`,
    },
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`GET /api/tasks failed with ${response.status}: ${detail}`);
  }

  const tasks = (body as { tasks?: Task[] } | undefined)?.tasks;
  if (!Array.isArray(tasks)) {
    throw new Error("Unexpected response shape from GET /api/tasks: missing tasks array");
  }

  return tasks;
}
