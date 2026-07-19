import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const post = vi.fn().mockResolvedValue({});

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post }),
}));

describe("POST /api/users/me/password", () => {
  it("returns 403 without CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/password", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc" },
      body: JSON.stringify({ current_password: "old", new_password: "new" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("returns 204 with matching CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/password", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ current_password: "old", new_password: "new" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(204);
  });

  it("translates an upstream failure into a JSON error instead of throwing", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "Incorrect current password" } },
    });
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/password", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ current_password: "old", new_password: "new" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe("Incorrect current password");
  });
});
