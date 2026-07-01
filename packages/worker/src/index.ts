import { handleMcp } from "./mcp";
import { handleRest } from "./rest";
import { json } from "./http";
import type { Env } from "./types";

const endpoints = ["/health", "/api", "/api/tasks", "/api/tasks/:id", "/api/tasks/claim", "/mcp"];
const websiteOnlyHost = "cloud-tasks.keremorenli.com";

function isApiOrMcpPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/") || pathname === "/mcp" || pathname.startsWith("/mcp/");
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === websiteOnlyHost && isApiOrMcpPath(url.pathname)) {
      return json({ error: "This host only serves the Cloud Tasks website." }, { status: 404 });
    }

    if (url.pathname === "/health") {
      return json({ ok: true, service: "cloud-tasks" });
    }

    if (url.pathname === "/api" || url.pathname === "/api/") {
      return json({ service: "cloud-tasks", endpoints });
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
        endpoints,
      },
      { status: 404 },
    );
  },
};
