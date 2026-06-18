import { handleMcp } from "./mcp";
import { handleRest } from "./rest";
import { json } from "./http";
import type { Env } from "./types";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true, service: "cloud-tasks" });
    }

    if (url.pathname.startsWith("/api/tasks")) {
      return handleRest(request, env);
    }

    if (url.pathname === "/mcp") {
      return handleMcp(request, env, ctx);
    }

    return json(
      {
        service: "cloud-tasks",
        endpoints: ["/health", "/api/tasks", "/api/tasks/:id", "/api/tasks/claim", "/mcp"],
      },
      { status: 404 },
    );
  },
};
