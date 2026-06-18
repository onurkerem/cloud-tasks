export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function notFound(message = "Task not found.") {
  return new HttpError(404, message);
}

export function conflict(message: string) {
  return new HttpError(409, message);
}
