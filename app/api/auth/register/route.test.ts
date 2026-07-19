// app/api/auth/register/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    post: vi.fn().mockResolvedValue({
      data: {
        user: { id: "1", email: "a@b.com", username: "a", display_name: "A" },
        access_token: "at",
        refresh_token: "rt",
        token_type: "bearer",
      },
    }),
  }),
}));

describe("POST /api/auth/register", () => {
  it("proxies to the API and sets auth cookies", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "a@b.com",
        username: "a",
        password: "pw",
        display_name: "A",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("access_token");
  });
});
