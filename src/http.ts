import { ZodError } from "zod";
import { HttpError } from "./errors";

export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message, details: error.details }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return json({ error: "Validation failed.", details: error.flatten() }, { status: 400 });
  }

  console.error(error);
  return json({ error: "Internal server error." }, { status: 500 });
}
