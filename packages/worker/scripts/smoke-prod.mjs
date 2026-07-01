const baseUrl = process.env.WORKER_URL;
const apiKey = process.env.API_KEY;
const cfAccessJwt = process.env.CF_ACCESS_JWT;

if (!baseUrl || !apiKey) {
  console.error("Usage: WORKER_URL=https://<worker>.<account>.workers.dev API_KEY=<secret> npm run smoke:prod");
  process.exit(1);
}

const root = baseUrl.replace(/\/$/, "");
const taskId = `smoke-${Date.now()}`;

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${apiKey}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${root}${path}`, { ...init, headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed with ${response.status}: ${text}`);
  }

  return { response, body };
}

async function mcp(message) {
  if (!cfAccessJwt) {
    return undefined;
  }

  const headers = new Headers({
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    "cf-access-jwt-assertion": cfAccessJwt,
  });
  const response = await fetch(`${root}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });
  const eventText = await response.text();
  if (!response.ok) {
    throw new Error(`POST /mcp failed with ${response.status}: ${eventText}`);
  }

  const dataLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: "));
  if (!dataLine) {
    throw new Error(`MCP response did not include an SSE data line: ${eventText}`);
  }
  return JSON.parse(dataLine.slice("data: ".length));
}

try {
  await request("/health", { headers: { authorization: "" } });
  const apiIndex = await request("/api");
  if (!apiIndex.body.endpoints?.includes("/api/tasks")) {
    throw new Error("API index did not advertise /api/tasks.");
  }

  await request("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      id: taskId,
      description: "Production smoke task",
      tags: ["smoke", "mcp"],
      assignee: "",
      status: "todo",
    }),
  });
  const listed = await request(`/api/tasks?status=todo&tag=smoke`);
  if (!listed.body.tasks.some((task) => task.id === taskId)) {
    throw new Error("Created task was not returned by filtered REST list.");
  }
  await request("/api/tasks/claim", {
    method: "POST",
    body: JSON.stringify({ assignee: "prod-smoke", tags: ["smoke"] }),
  });

  const tools = await mcp({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });
  if (tools) {
    const toolNames = tools.result?.tools?.map((tool) => tool.name) ?? [];
    for (const expected of ["create_task", "list_tasks", "claim_next_task"]) {
      if (!toolNames.includes(expected)) {
        throw new Error(`MCP tools/list did not include ${expected}.`);
      }
    }
  }

  await request(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
  console.log(`Production smoke passed for ${root}`);
} catch (error) {
  try {
    await request(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
  } catch {
    // Best effort cleanup.
  }
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
