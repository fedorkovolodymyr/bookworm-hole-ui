import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const post = vi.fn().mockResolvedValue({ data: { deletion_scheduled_at: null } });

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post }),
}));

describe("POST /api/users/me/delete/cancel", () => {
  it("returns 403 without CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/delete/cancel", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("proxies the cancellation with matching CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/delete/cancel", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deletion_scheduled_at).toBe(null);
  });

  it("translates an upstream failure into a JSON error instead of throwing", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "No deletion scheduled" } },
    });
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/delete/cancel", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe("No deletion scheduled");
  });
});
