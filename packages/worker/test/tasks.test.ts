import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { env, SELF } from "cloudflare:test";
import type { Env as AppEnv } from "../src/types";

const API_KEY = "test-secret";
const ACCESS_TEAM_DOMAIN = "https://team.cloudflareaccess.com";
const ACCESS_AUD = "test-access-aud";
const testEnv = env as unknown as AppEnv;
const headers = {
  authorization: `Bearer ${API_KEY}`,
  "content-type": "application/json",
};

async function api(path: string, init: RequestInit = {}) {
  return SELF.fetch(`https://example.com${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
}

function base64Url(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createAccessAssertion(): Promise<string> {
  const keyPair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const jwk = { ...publicJwk, kid: "test-key", alg: "RS256" };

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ keys: [jwk] })),
  );

  testEnv.CF_ACCESS_TEAM_DOMAIN = ACCESS_TEAM_DOMAIN;
  testEnv.CF_ACCESS_POLICY_AUD = ACCESS_AUD;

  const header = base64Url(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: ACCESS_TEAM_DOMAIN,
      aud: [ACCESS_AUD],
      exp: Math.floor(Date.now() / 1000) + 300,
      email: "agent@example.com",
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    new TextEncoder().encode(signingInput),
  );

  return `${signingInput}.${base64Url(signature)}`;
}

async function mcp(message: unknown) {
  const assertion = await createAccessAssertion();
  const response = await api("/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
      "cf-access-jwt-assertion": assertion,
    },
    body: JSON.stringify(message),
  });
  const body = await response.text();
  const dataLine = body.split("\n").find((line) => line.startsWith("data: "));
  if (!dataLine) {
    throw new Error(`Expected MCP SSE data line, got: ${body}`);
  }
  return {
    response,
    body: JSON.parse(dataLine.slice("data: ".length)) as {
      result?: unknown;
      error?: unknown;
    },
  };
}

beforeAll(async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      assignee TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`,
    `CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (task_id, tag),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_tasks_status_created_at ON tasks(status, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)",
    "CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags(tag)",
  ];

  for (const statement of statements) {
    await testEnv.DB.prepare(statement).run();
  }
});

afterAll(async () => {
  await testEnv.DB.prepare("DELETE FROM task_tags").run();
  await testEnv.DB.prepare("DELETE FROM tasks").run();
  vi.unstubAllGlobals();
});

describe("REST task API", () => {
  it("serves an API index", async () => {
    const response = await SELF.fetch("https://example.com/api");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { endpoints: string[] };
    expect(body.endpoints).toEqual(expect.arrayContaining(["/api/tasks", "/mcp"]));
  });

  it("requires an API key", async () => {
    const response = await SELF.fetch("https://example.com/api/tasks");
    expect(response.status).toBe(401);
  });

  it("creates, reads, filters, updates, claims, and deletes tasks", async () => {
    const createResponse = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        id: "task-1",
        description: "Ship the basic Cloudflare task API",
        tags: ["Cloudflare", "backend"],
        assignee: "",
      }),
    });
    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as { task: { id: string; tags: string[] } };
    expect(created.task.id).toBe("task-1");
    expect(created.task.tags).toEqual(["backend", "cloudflare"]);

    const listResponse = await api("/api/tasks?status=todo&tag=backend");
    expect(listResponse.status).toBe(200);
    const listed = (await listResponse.json()) as { tasks: Array<{ id: string }> };
    expect(listed.tasks.map((task) => task.id)).toContain("task-1");

    const patchResponse = await api("/api/tasks/task-1", {
      method: "PATCH",
      body: JSON.stringify({ assignee: "agent-a" }),
    });
    expect(patchResponse.status).toBe(200);
    const patched = (await patchResponse.json()) as { task: { assignee: string } };
    expect(patched.task.assignee).toBe("agent-a");

    const claimResponse = await api("/api/tasks/claim", {
      method: "POST",
      body: JSON.stringify({ assignee: "agent-b", tags: ["backend"] }),
    });
    expect(claimResponse.status).toBe(200);
    const claimed = (await claimResponse.json()) as {
      task: { id: string; status: string; assignee: string } | null;
    };
    expect(claimed.task?.id).toBe("task-1");
    expect(claimed.task?.status).toBe("in_progress");
    expect(claimed.task?.assignee).toBe("agent-b");

    const deleteResponse = await api("/api/tasks/task-1", { method: "DELETE" });
    expect(deleteResponse.status).toBe(204);
    const getDeletedResponse = await api("/api/tasks/task-1");
    expect(getDeletedResponse.status).toBe(404);
  });

  it("validates invalid task input", async () => {
    const response = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ description: "", status: "blocked" }),
    });
    expect(response.status).toBe(400);
  });

  it("serves the API on the tasks host with an API key", async () => {
    const response = await SELF.fetch("https://tasks.keremorenli.com/api/tasks", {
      headers,
    });
    expect(response.status).toBe(200);
  });

  it("blocks API and MCP routes on the website host", async () => {
    for (const path of ["/api", "/api/tasks", "/mcp"]) {
      const response = await SELF.fetch(`https://cloud-tasks.keremorenli.com${path}`, {
        method: path === "/mcp" ? "POST" : "GET",
        headers: {
          ...headers,
          accept: "application/json, text/event-stream",
        },
        body:
          path === "/mcp"
            ? JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} })
            : undefined,
      });
      expect(response.status).toBe(404);
      await expect(response.json()).resolves.toMatchObject({
        error: "This host only serves the Cloud Tasks website.",
      });
    }
  });
});

describe("MCP task tools", () => {
  it("requires credentials", async () => {
    const response = await SELF.fetch("https://example.com/mcp", {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(response.status).toBe(401);
  });

  it("rejects API key auth on MCP", async () => {
    const response = await SELF.fetch("https://tasks.keremorenli.com/mcp", {
      method: "POST",
      headers: {
        ...headers,
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Missing Cloudflare Access assertion.",
    });
  });

  it("lists and calls task tools", async () => {
    const listed = await mcp({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
    expect(listed.response.status).toBe(200);
    const toolsResult = listed.body.result as { tools: Array<{ name: string }> };
    const toolNames = toolsResult.tools.map((tool) => tool.name);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        "create_task",
        "list_tasks",
        "get_task",
        "update_task",
        "delete_task",
        "claim_next_task",
      ]),
    );

    const created = await mcp({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "create_task",
        arguments: {
          id: "mcp-task-1",
          description: "Create task through MCP",
          tags: ["mcp", "backend"],
          assignee: "agent-mcp",
          status: "todo",
        },
      },
    });
    const callResult = created.body.result as {
      content: Array<{ text: string }>;
      structuredContent: { task: { id: string; tags: string[]; status: string } };
    };
    const payload = JSON.parse(callResult.content[0].text) as {
      task: { id: string; tags: string[]; status: string };
    };
    expect(payload.task.id).toBe("mcp-task-1");
    expect(payload.task.tags).toEqual(["backend", "mcp"]);
    expect(payload.task.status).toBe("todo");

    expect(callResult.structuredContent.task.id).toBe("mcp-task-1");
    expect(callResult.structuredContent.task.tags).toEqual(["backend", "mcp"]);
    expect(callResult.structuredContent.task.status).toBe("todo");

    const deleteResponse = await api("/api/tasks/mcp-task-1", { method: "DELETE" });
    expect(deleteResponse.status).toBe(204);
  });
});
