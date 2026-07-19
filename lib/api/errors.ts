export function isAxiosError(
  error: unknown,
): error is { response?: { data?: unknown; status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}
