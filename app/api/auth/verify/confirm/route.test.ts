import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const post = vi.fn().mockResolvedValue({
  data: { id: "1", email: "a@b.com", username: "a", display_name: "A", email_verified_at: "2026-01-01" },
});

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ post }),
}));

describe("POST /api/auth/verify/confirm", () => {
  it("proxies the token and returns the updated user", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/verify/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "verify-token" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.email_verified_at).toBe("2026-01-01");
  });

  it("translates an upstream failure into a JSON error instead of throwing", async () => {
    post.mockRejectedValueOnce({
      response: { status: 410, data: { detail: "Token expired" } },
    });
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/verify/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "expired-token" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(410);
    const body = await response.json();
    expect(body.detail).toBe("Token expired");
  });
});
