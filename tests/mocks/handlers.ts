import { http, HttpResponse } from "msw";

const profile = {
  id: "1",
  email: "a@b.com",
  username: "alice",
  display_name: "Alice",
  bio: null,
  avatar_url: null,
  locale: "en",
  timezone: "UTC",
  is_active: true,
  is_admin: false,
  deletion_scheduled_at: null,
};

export const handlers = [
  http.post("/api/auth/register", () =>
    HttpResponse.json({ user: { ...profile, email_verified_at: null } }, { status: 201 }),
  ),
  http.post("/api/auth/login", () =>
    HttpResponse.json({ user: { ...profile, email_verified_at: null } }),
  ),
  http.post("/api/auth/logout", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/auth/verify/request", () => new HttpResponse(null, { status: 202 })),
  http.post("/api/auth/verify/confirm", () =>
    HttpResponse.json({ ...profile, email_verified_at: "2026-01-01T00:00:00Z" }),
  ),
  http.get("/api/users/me", () => HttpResponse.json(profile)),
  http.patch("/api/users/me", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ ...profile, ...body });
  }),
  http.post("/api/users/me/password", () => new HttpResponse(null, { status: 204 })),
  http.post("/api/users/me/deactivate", () =>
    HttpResponse.json({ ...profile, is_active: false }),
  ),
  http.post("/api/users/me/delete", () =>
    HttpResponse.json({ ...profile, deletion_scheduled_at: "2026-08-18T00:00:00Z" }),
  ),
  http.post("/api/users/me/delete/cancel", () =>
    HttpResponse.json({ ...profile, deletion_scheduled_at: null }),
  ),
];
