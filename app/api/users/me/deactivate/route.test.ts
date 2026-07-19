import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const post = vi.fn().mockResolvedValue({ data: { is_active: false } });

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post }),
}));

describe("POST /api/users/me/deactivate", () => {
  it("returns 403 without CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/deactivate", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  it("proxies the deactivation with matching CSRF header", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/deactivate", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.is_active).toBe(false);
  });

  it("translates an upstream failure into a JSON error instead of throwing", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "Already deactivated" } },
    });
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me/deactivate", {
      method: "POST",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe("Already deactivated");
  });
});
