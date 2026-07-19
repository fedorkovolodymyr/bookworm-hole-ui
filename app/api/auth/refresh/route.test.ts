// app/api/auth/refresh/route.test.ts
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({
    post: vi.fn().mockResolvedValue({
      data: { access_token: "new-at", refresh_token: "new-rt", token_type: "bearer" },
    }),
  }),
}));

describe("POST /api/auth/refresh", () => {
  it("returns 401 when no refresh_token cookie present", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/refresh", { method: "POST" });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("sets new cookies on success", async () => {
    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: { cookie: "refresh_token=old-rt" },
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("access_token=new-at");
  });
});
