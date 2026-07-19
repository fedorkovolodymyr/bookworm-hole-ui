// app/api/auth/logout/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post: vi.fn().mockResolvedValue({}) }),
}));

describe("POST /api/auth/logout", () => {
  it("returns 403 when CSRF header is missing", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: "refresh_token=rt; csrf_token=abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("clears cookies and returns 204 when CSRF header matches", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
      headers: { cookie: "refresh_token=rt; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("access_token=;");
  });
});
