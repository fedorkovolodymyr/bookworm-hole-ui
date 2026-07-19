import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post: vi.fn().mockResolvedValue({}) }),
}));

describe("POST /api/auth/verify/request", () => {
  it("returns 403 without matching CSRF token", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/verify/request", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("returns 202 with matching CSRF token", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/verify/request", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(202);
  });
});
