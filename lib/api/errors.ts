export function isAxiosError(
  error: unknown,
): error is { response?: { data?: unknown; status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}

/**
 * Extracts a human-readable message from an API error for display in
 * form-level error UI. Falls back to a generic message when the error
 * doesn't carry a `{ detail: string }` response body (e.g. network errors).
 */
export function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === "string") {
      return detail;
    }
  }
  return "Something went wrong. Please try again.";
}
