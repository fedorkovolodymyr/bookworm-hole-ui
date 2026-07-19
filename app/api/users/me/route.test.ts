import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const profile = {
  id: "1",
  email: "a@b.com",
  username: "a",
  display_name: "A",
  bio: null,
  avatar_url: null,
  locale: "en",
  timezone: "UTC",
  is_active: true,
  is_admin: false,
  deletion_scheduled_at: null,
};

const get = vi.fn().mockResolvedValue({ data: profile });
const patch = vi.fn().mockResolvedValue({ data: { ...profile, display_name: "Updated" } });

vi.mock("@/lib/api/server-client", () => ({
  createServerApiClient: () => ({ get, patch }),
}));

describe("GET /api/users/me", () => {
  it("returns the profile", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      headers: { cookie: "access_token=at" },
    });
    const response = await GET(request);
    const body = await response.json();
    expect(body.username).toBe("a");
  });

  it("translates an upstream failure into a JSON error instead of throwing", async () => {
    get.mockRejectedValueOnce({
      response: { status: 401, data: { detail: "Not authenticated" } },
    });
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      headers: { cookie: "access_token=at" },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.detail).toBe("Not authenticated");
  });
});

describe("PATCH /api/users/me", () => {
  it("returns 403 without CSRF header", async () => {
    const { PATCH } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      method: "PATCH",
      headers: { cookie: "access_token=at; csrf_token=abc" },
      body: JSON.stringify({ display_name: "Updated" }),
    });
    const response = await PATCH(request);
    expect(response.status).toBe(403);
  });

  it("proxies the update with matching CSRF header", async () => {
    const { PATCH } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      method: "PATCH",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ display_name: "Updated" }),
    });
    const response = await PATCH(request);
    const body = await response.json();
    expect(body.display_name).toBe("Updated");
  });

  it("translates an upstream failure into a JSON error instead of throwing", async () => {
    patch.mockRejectedValueOnce({
      response: { status: 400, data: { detail: "Invalid payload" } },
    });
    const { PATCH } = await import("./route");
    const request = new NextRequest("http://localhost/api/users/me", {
      method: "PATCH",
      headers: { cookie: "access_token=at; csrf_token=abc", "x-csrf-token": "abc" },
      body: JSON.stringify({ display_name: "Updated" }),
    });
    const response = await PATCH(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.detail).toBe("Invalid payload");
  });
});
