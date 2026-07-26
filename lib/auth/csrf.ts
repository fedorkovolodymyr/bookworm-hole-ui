import { randomBytes, timingSafeEqual } from "node:crypto";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function verifyCsrfToken(
  cookieValue: string | undefined,
  headerValue: string | null,
): boolean {
  if (!cookieValue || !headerValue) return false;

  // Guard against length mismatch to avoid timingSafeEqual throwing
  if (cookieValue.length !== headerValue.length) return false;

  // Constant-time comparison using timingSafeEqual
  return timingSafeEqual(Buffer.from(cookieValue, "utf8"), Buffer.from(headerValue, "utf8"));
}
