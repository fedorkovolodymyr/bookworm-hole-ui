import { randomBytes } from "node:crypto";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyCsrfToken(
  cookieValue: string | undefined,
  headerValue: string | null,
): boolean {
  if (!cookieValue || !headerValue) return false;
  return cookieValue === headerValue;
}
