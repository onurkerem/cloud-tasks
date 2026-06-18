import { HttpError } from "./errors";
import type { Env } from "./types";

export function assertAuthorized(request: Request, env: Env) {
  if (!env.API_KEY) {
    throw new HttpError(500, "API_KEY secret is not configured.");
  }

  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = request.headers.get("x-api-key") ?? bearerToken;

  if (apiKey !== env.API_KEY) {
    throw new HttpError(401, "Unauthorized.");
  }
}
