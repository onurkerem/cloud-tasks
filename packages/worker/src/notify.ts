import type { Env, Task } from "./types";

/**
 * Best-effort push to the n8n dispatcher so it picks up new todo tasks within
 * seconds instead of waiting for its safety-net poll. No-ops entirely when
 * unconfigured (self-hosters, local dev, tests) and never surfaces a failure
 * to the API/MCP caller - the dispatcher's own poll is the fallback.
 */
export function notifyDispatcher(env: Env, ctx: ExecutionContext, task: Task): void {
  if (!env.N8N_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) return;
  if (task.status !== "todo") return;

  ctx.waitUntil(
    fetch(env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": env.N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ taskId: task.id, assignee: task.assignee }),
    }).catch(() => {}),
  );
}
