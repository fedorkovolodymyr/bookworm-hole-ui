import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  useActiveSessions,
  useDeleteSession,
  useReadingStats,
  useReadingStreak,
  useReadingTimeline,
  useSessions,
  useStartSession,
  useStopSession,
  useUpdateSession,
} from "./useReading";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useActiveSessions", () => {
  it("fetches active sessions", async () => {
    server.use(http.get("/api/me/reading/active", () => HttpResponse.json([{ id: "s1" }])));
    const { result } = renderHook(() => useActiveSessions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("s1");
  });
});

describe("useSessions", () => {
  it("fetches session history", async () => {
    server.use(http.get("/api/me/reading/sessions", () => HttpResponse.json([{ id: "s1" }])));
    const { result } = renderHook(() => useSessions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("s1");
  });
});

describe("useStartSession", () => {
  it("starts a session", async () => {
    server.use(
      http.post("/api/me/reading/start", () =>
        HttpResponse.json({ id: "s1", release_id: "r1" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useStartSession(), { wrapper });
    result.current.mutate({ release_id: "r1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useStopSession", () => {
  it("stops a session", async () => {
    server.use(
      http.post("/api/me/reading/stop", () => HttpResponse.json({ id: "s1", ended_at: "now" })),
    );
    const { result } = renderHook(() => useStopSession(), { wrapper });
    result.current.mutate({ release_id: "r1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useUpdateSession", () => {
  it("updates a session", async () => {
    server.use(
      http.patch("/api/me/reading/sessions/s1", () => HttpResponse.json({ id: "s1", notes: "x" })),
    );
    const { result } = renderHook(() => useUpdateSession(), { wrapper });
    result.current.mutate({ sessionId: "s1", payload: { notes: "x" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteSession", () => {
  it("deletes a session", async () => {
    server.use(
      http.delete("/api/me/reading/sessions/s1", () => new HttpResponse(null, { status: 204 })),
    );
    const { result } = renderHook(() => useDeleteSession(), { wrapper });
    result.current.mutate("s1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReadingStats", () => {
  it("fetches stats for a period", async () => {
    server.use(
      http.get("/api/me/reading/stats", () =>
        HttpResponse.json({ total_minutes: 1, total_sessions: 1, unique_books: 1, total_pages: 1 }),
      ),
    );
    const { result } = renderHook(() => useReadingStats("week"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.total_minutes).toBe(1);
  });
});

describe("useReadingStreak", () => {
  it("fetches streak", async () => {
    server.use(
      http.get("/api/me/reading/streak", () =>
        HttpResponse.json({ current_streak_days: 2, longest_streak_days: 4 }),
      ),
    );
    const { result } = renderHook(() => useReadingStreak(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.current_streak_days).toBe(2);
  });
});

describe("useReadingTimeline", () => {
  it("fetches timeline for a date range", async () => {
    server.use(http.get("/api/me/reading/timeline", () => HttpResponse.json({ items: [] })));
    const { result } = renderHook(() => useReadingTimeline("2026-07-01", "2026-07-22"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
  });
});
