import { createMcpHandler } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { assertAuthorized } from "./auth";
import { errorResponse } from "./http";
import {
  claimTaskSchema,
  createTaskSchema,
  listTaskFiltersSchema,
  taskSchema,
  taskStatusSchema,
  updateTaskSchema,
} from "./schemas";
import {
  claimNextTask,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from "./repository";
import type { Env } from "./types";

function result(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
    structuredContent: data as Record<string, unknown>,
  };
}

function createServer(env: Env) {
  const server = new McpServer({ name: "cloud-tasks", version: "1.0.0" });

  server.registerTool(
    "create_task",
    {
      title: "Create Task",
      description: "Create a task in the Cloud Tasks store.",
      inputSchema: {
        id: z.string().min(1).max(128).optional(),
        description: z.string().min(1).max(50_000),
        tags: z.array(z.string().min(1).max(64)).max(25).default([]),
        assignee: z.string().max(128).default(""),
        status: taskStatusSchema.default("todo"),
      },
      outputSchema: { task: taskSchema },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => result({ task: await createTask(env.DB, createTaskSchema.parse(input)) }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description: "List tasks, optionally filtering by status, assignee, tags, id, or text query.",
      inputSchema: {
        id: z.string().min(1).max(128).optional(),
        status: taskStatusSchema.optional(),
        assignee: z.string().max(128).optional(),
        tags: z.array(z.string().min(1).max(64)).max(25).default([]),
        q: z.string().min(1).max(500).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      },
      outputSchema: { tasks: z.array(taskSchema) },
      annotations: { readOnlyHint: true },
    },
    async (input) => result({ tasks: await listTasks(env.DB, listTaskFiltersSchema.parse(input)) }),
  );

  server.registerTool(
    "get_task",
    {
      title: "Get Task",
      description: "Get a task by id.",
      inputSchema: { id: z.string().min(1).max(128) },
      outputSchema: { task: taskSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => result({ task: await getTask(env.DB, id) }),
  );

  server.registerTool(
    "update_task",
    {
      title: "Update Task",
      description: "Update one or more task fields.",
      inputSchema: {
        id: z.string().min(1).max(128),
        description: z.string().min(1).max(50_000).optional(),
        tags: z.array(z.string().min(1).max(64)).max(25).optional(),
        assignee: z.string().max(128).optional(),
        status: taskStatusSchema.optional(),
      },
      outputSchema: { task: taskSchema },
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ id, ...patch }) =>
      result({ task: await updateTask(env.DB, id, updateTaskSchema.parse(patch)) }),
  );

  server.registerTool(
    "delete_task",
    {
      title: "Delete Task",
      description: "Delete a task by id.",
      inputSchema: { id: z.string().min(1).max(128) },
      outputSchema: { deleted: z.boolean(), id: z.string() },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ id }) => {
      await deleteTask(env.DB, id);
      return result({ deleted: true, id });
    },
  );

  server.registerTool(
    "claim_next_task",
    {
      title: "Claim Next Task",
      description: "Pick the oldest todo task, mark it in_progress, and assign it.",
      inputSchema: {
        assignee: z.string().min(1).max(128),
        tags: z.array(z.string().min(1).max(64)).max(25).default([]),
      },
      outputSchema: { task: taskSchema.nullable() },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input) => {
      const parsed = claimTaskSchema.parse(input);
      return result({ task: await claimNextTask(env.DB, parsed.assignee, parsed.tags) });
    },
  );

  return server;
}

export async function handleMcp(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  try {
    await assertAuthorized(request, env);
    return createMcpHandler(createServer(env))(request, env, ctx);
  } catch (error) {
    return errorResponse(error);
  }
}
