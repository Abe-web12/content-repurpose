import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function apiErrorResponse(err: unknown, defaultMessage = "Internal server error") {
  if (isAppError(err)) {
    return {
      error: err.message,
      status: err.statusCode,
    };
  }

  const serverError = err instanceof Error ? err.message : String(err);
  console.error("[API Error]", serverError, err instanceof Error ? err.stack : "");

  if (process.env.NODE_ENV === "production") {
    return { error: defaultMessage, status: 500 };
  }

  return { error: serverError, status: 500 };
}

const MAX_REQUEST_SIZE = 1024 * 100;

export async function parseBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new AppError("Content-Type must be application/json", 400);
  }

  const text = await request.text();
  if (text.length > MAX_REQUEST_SIZE) {
    throw new AppError("Request body too large", 413);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError("Invalid JSON in request body", 400);
  }
}

export function sanitizeError(err: unknown): { error: string; status: number } {
  if (err instanceof ZodError) {
    const messages = (err as any).errors?.map((e: any) => e.message).join("; ") || "Invalid input";
    return { error: messages, status: 400 };
  }
  const response = apiErrorResponse(err);
  return { error: response.error, status: response.status };
}
