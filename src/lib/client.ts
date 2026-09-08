"use client";

/**
 * Browser-side API client. Unwraps the `{ data }` / `{ error }` envelope so
 * callers deal in values and thrown ApiErrors, never in response shapes.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code: string; message: string } }
    | null;

  if (!res.ok || body?.error) {
    throw new ApiError(
      body?.error?.code ?? "unknown",
      body?.error?.message ?? "Something went wrong. Please try again.",
      res.status,
    );
  }
  return body!.data as T;
}
