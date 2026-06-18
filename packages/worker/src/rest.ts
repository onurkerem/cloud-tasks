import { assertAuthorized } from "./auth";
import { HttpError } from "./errors";
import { errorResponse, json, readJson } from "./http";
import {
  claimTaskSchema,
  createTaskSchema,
  listTaskFiltersSchema,
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

function parseFilters(url: URL) {
  const tags = [...url.searchParams.getAll("tag")];
  const commaTags = url.searchParams.get("tags")?.split(",") ?? [];
  return listTaskFiltersSchema.parse({
    id: url.searchParams.get("id") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    assignee: url.searchParams.get("assignee") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    tags: [...tags, ...commaTags].filter(Boolean),
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
  });
}

export async function handleRest(request: Request, env: Env): Promise<Response> {
  try {
    assertAuthorized(request, env);

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/tasks\/?/, "");
    const id = path && path !== "claim" ? decodeURIComponent(path) : undefined;

    if (url.pathname === "/api/tasks" || url.pathname === "/api/tasks/") {
      if (request.method === "GET") {
        return json({ tasks: await listTasks(env.DB, parseFilters(url)) });
      }
      if (request.method === "POST") {
        const input = createTaskSchema.parse(await readJson(request));
        return json({ task: await createTask(env.DB, input) }, { status: 201 });
      }
    }

    if (url.pathname === "/api/tasks/claim" && request.method === "POST") {
      const input = claimTaskSchema.parse(await readJson(request));
      return json({ task: await claimNextTask(env.DB, input.assignee, input.tags) });
    }

    if (id) {
      if (request.method === "GET") {
        return json({ task: await getTask(env.DB, id) });
      }
      if (request.method === "PATCH") {
        const input = updateTaskSchema.parse(await readJson(request));
        return json({ task: await updateTask(env.DB, id, input) });
      }
      if (request.method === "DELETE") {
        await deleteTask(env.DB, id);
        return new Response(null, { status: 204 });
      }
    }

    throw new HttpError(404, "Not found.");
  } catch (error) {
    return errorResponse(error);
  }
}
