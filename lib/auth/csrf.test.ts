import { describe, expect, it } from "vitest";
import { generateCsrfToken, verifyCsrfToken } from "./csrf";

describe("csrf", () => {
  it("generates a non-empty random token", () => {
    const token = generateCsrfToken();
    expect(token).toBeTruthy();
    expect(generateCsrfToken()).not.toBe(token);
  });

  it("passes when header matches cookie", () => {
    expect(verifyCsrfToken("abc123", "abc123")).toBe(true);
  });

  it("fails when header is missing", () => {
    expect(verifyCsrfToken("abc123", null)).toBe(false);
  });

  it("fails when cookie is missing", () => {
    expect(verifyCsrfToken(undefined, "abc123")).toBe(false);
  });

  it("fails when header does not match cookie", () => {
    expect(verifyCsrfToken("abc123", "xyz789")).toBe(false);
  });
});
