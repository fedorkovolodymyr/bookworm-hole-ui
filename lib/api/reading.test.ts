import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  deleteSession,
  getActiveSessions,
  getSessions,
  getStats,
  getStreak,
  getTimeline,
  startSession,
  stopSession,
  updateSession,
} from "./reading";

describe("reading API client", () => {
  it("getActiveSessions fetches /me/reading/active", async () => {
    server.use(
      http.get("/api/me/reading/active", () =>
        HttpResponse.json([{ id: "s1", ended_at: null }]),
      ),
    );
    const result = await getActiveSessions();
    expect(result[0].id).toBe("s1");
  });

  it("getSessions passes release_id as a query param", async () => {
    server.use(
      http.get("/api/me/reading/sessions", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("release_id")).toBe("r1");
        return HttpResponse.json([{ id: "s1" }]);
      }),
    );
    const result = await getSessions({ release_id: "r1" });
    expect(result[0].id).toBe("s1");
  });

  it("startSession posts to /me/reading/start", async () => {
    server.use(
      http.post("/api/me/reading/start", () =>
        HttpResponse.json({ id: "s1", release_id: "r1" }, { status: 201 }),
      ),
    );
    const result = await startSession({ release_id: "r1" });
    expect(result.id).toBe("s1");
  });

  it("stopSession posts to /me/reading/stop", async () => {
    server.use(
      http.post("/api/me/reading/stop", () =>
        HttpResponse.json({ id: "s1", ended_at: "2026-07-22T10:00:00Z" }),
      ),
    );
    const result = await stopSession({ release_id: "r1" });
    expect(result.ended_at).toBe("2026-07-22T10:00:00Z");
  });

  it("updateSession patches /me/reading/sessions/:id", async () => {
    server.use(
      http.patch("/api/me/reading/sessions/s1", () =>
        HttpResponse.json({ id: "s1", notes: "updated" }),
      ),
    );
    const result = await updateSession("s1", { notes: "updated" });
    expect(result.notes).toBe("updated");
  });

  it("deleteSession deletes /me/reading/sessions/:id", async () => {
    server.use(http.delete("/api/me/reading/sessions/s1", () => new HttpResponse(null, { status: 204 })));
    await expect(deleteSession("s1")).resolves.toBeUndefined();
  });

  it("getStats passes period as a query param", async () => {
    server.use(
      http.get("/api/me/reading/stats", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("period")).toBe("year");
        return HttpResponse.json({ total_minutes: 10, total_sessions: 1, unique_books: 1, total_pages: 5 });
      }),
    );
    const result = await getStats("year");
    expect(result.total_minutes).toBe(10);
  });

  it("getStreak fetches /me/reading/streak", async () => {
    server.use(
      http.get("/api/me/reading/streak", () =>
        HttpResponse.json({ current_streak_days: 3, longest_streak_days: 5 }),
      ),
    );
    const result = await getStreak();
    expect(result.current_streak_days).toBe(3);
  });

  it("getTimeline passes from_date/to_date as query params", async () => {
    server.use(
      http.get("/api/me/reading/timeline", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("from_date")).toBe("2026-07-01");
        expect(url.searchParams.get("to_date")).toBe("2026-07-22");
        return HttpResponse.json({ items: [] });
      }),
    );
    const result = await getTimeline("2026-07-01", "2026-07-22");
    expect(result.items).toEqual([]);
  });
});
