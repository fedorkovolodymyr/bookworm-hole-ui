# Block 4 (Reading) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Reading domain (Block 4) end-to-end: typed API client, TanStack Query hooks, presentational components with Storybook coverage, and a `/reading` dashboard page — covering start/stop sessions, session history with edit/delete, and a stats/streak/timeline dashboard, all wired to the live API (the prior `streak`/`timeline` 500 bug, API#141, is resolved and re-verified).

**Architecture:** Follows the established per-domain shape from Blocks 1-3: `lib/api/reading.ts` (typed axios calls) → `hooks/useReading.ts` (TanStack Query queries/mutations) → `components/reading/*` (presentational, Storybook-covered, `next-intl` for copy) → `app/(app)/reading/page.tsx` (wiring). No book/release browsing UI is built here — the release picker for starting a session reuses `useLibrary()` from Block 3's `useStatuses.ts`, which already returns the user's owned releases.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, axios, shadcn/ui components already in `components/ui/`, `next-intl` for i18n (`messages/en.json` + `messages/uk.json`), Vitest + React Testing Library + `msw` for tests, Storybook for component stories. No new npm dependency — the two charts (calendar heatmap, timeline bar chart) are built as plain inline SVG components per the `dataviz` skill's guidance, using existing `--chart-1`..`--chart-5` and `--primary` CSS variables (already defined in `app/globals.css` for light/dark) rather than pulling in a charting library for two simple chart types.

## Global Constraints

- All API calls from client components go through `apiClient` (`lib/api/client.ts`, baseURL `/api`, `withCredentials: true`) — never call the backend directly from the browser.
- Every domain hook file follows `hooks/use<Domain>.ts` naming; every query/mutation invalidates the query keys documented under "Interfaces" in each task below — copy them exactly, later tasks depend on them.
- Every user-facing string goes through `useTranslations("reading.<subkey>")` and must be added to **both** `messages/en.json` and `messages/uk.json` in the same commit — a missing key in one file is a bug, not a follow-up.
- Every component in `components/reading/` ships a `.stories.tsx` (Storybook) and a `.test.tsx` (Vitest + RTL) alongside it, matching the file-triplet pattern used in `components/statuses/` and `components/reviews/`.
- Money/positions/dates: `position_unit` is a nullable enum (`page`|`percent`|`location`|`timestamp`); always render/label it per-unit, never assume "page".
- Do not swallow a 500 into the same UI as a legitimate "no data yet" 200 empty state — they must render visibly distinct states (explicit error banner vs. empty-state copy).
- Do not build any book/release search or browse UI — assume `release_id` is already known (passed as a prop) or picked from `useLibrary()`'s existing release list.
- Run `pnpm lint`, `pnpm typecheck`, and the relevant `pnpm test` scope before every commit that touches source files.

---

### Task 1: Reading domain types

**Files:**

- Modify: `lib/api/types.ts` (append a new `// --- Reading domain types ---` section at the end of the file)

**Interfaces:**

- Consumes: nothing (pure type definitions).
- Produces: `PositionUnit`, `ReadingSessionResponse`, `CreateReadingSessionPayload`, `StopReadingSessionPayload`, `UpdateReadingSessionPayload`, `ReadingStatsPeriod`, `ReadingStatsResponse`, `StreakResponse`, `TimelineEntry`, `TimelineResponse`, `ReadingSessionListParams` — exact shapes below, used by every later task.

- [ ] **Step 1: Append the reading domain types**

Add to the end of `lib/api/types.ts`:

```typescript
// --- Reading domain types ---

export type PositionUnit = "page" | "percent" | "location" | "timestamp";

export interface ReadingSessionResponse {
  id: string;
  user_id: string;
  release_id: string;
  started_at: string;
  ended_at: string | null;
  position_start: number | null;
  position_end: number | null;
  position_unit: PositionUnit | null;
  pages_read: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReadingSessionPayload {
  release_id: string;
  position_start?: number | null;
  position_unit?: PositionUnit | null;
}

export interface StopReadingSessionPayload {
  release_id: string;
  position_end?: number | null;
  notes?: string | null;
}

export interface UpdateReadingSessionPayload {
  started_at?: string;
  ended_at?: string | null;
  position_start?: number | null;
  position_end?: number | null;
  position_unit?: PositionUnit | null;
  pages_read?: number | null;
  notes?: string | null;
}

export type ReadingStatsPeriod = "week" | "month" | "year" | "all";

export interface ReadingStatsResponse {
  total_minutes: number;
  total_sessions: number;
  unique_books: number;
  total_pages: number;
}

export interface StreakResponse {
  current_streak_days: number;
  longest_streak_days: number;
}

export interface TimelineEntry {
  date: string;
  total_minutes: number;
  sessions: number;
  pages_read: number;
}

export interface TimelineResponse {
  items: TimelineEntry[];
}

export interface ReadingSessionListParams {
  release_id?: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (types are additive, nothing consumes them yet).

- [ ] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(reading): add reading domain types"
```

---

### Task 2: Reading API client

**Files:**

- Create: `lib/api/reading.ts`
- Create: `lib/api/reading.test.ts`

**Interfaces:**

- Consumes: `apiClient` from `lib/api/client.ts`; types from Task 1 (`ReadingSessionResponse`, `CreateReadingSessionPayload`, `StopReadingSessionPayload`, `UpdateReadingSessionPayload`, `ReadingStatsPeriod`, `ReadingStatsResponse`, `StreakResponse`, `TimelineResponse`, `ReadingSessionListParams`).
- Produces: `getActiveSessions()`, `getSessions(params?)`, `startSession(payload)`, `stopSession(payload)`, `updateSession(sessionId, payload)`, `deleteSession(sessionId)`, `getStats(period?)`, `getStreak()`, `getTimeline(fromDate, toDate)` — exact names/signatures every later task calls.

- [ ] **Step 1: Write the failing test**

Create `lib/api/reading.test.ts`:

```typescript
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
      http.get("/api/me/reading/active", () => HttpResponse.json([{ id: "s1", ended_at: null }])),
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
    server.use(
      http.delete("/api/me/reading/sessions/s1", () => new HttpResponse(null, { status: 204 })),
    );
    await expect(deleteSession("s1")).resolves.toBeUndefined();
  });

  it("getStats passes period as a query param", async () => {
    server.use(
      http.get("/api/me/reading/stats", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("period")).toBe("year");
        return HttpResponse.json({
          total_minutes: 10,
          total_sessions: 1,
          unique_books: 1,
          total_pages: 5,
        });
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/reading.test.ts`
Expected: FAIL — `Cannot find module './reading'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/api/reading.ts`:

```typescript
import { apiClient } from "./client";
import type {
  CreateReadingSessionPayload,
  ReadingSessionListParams,
  ReadingSessionResponse,
  ReadingStatsPeriod,
  ReadingStatsResponse,
  StopReadingSessionPayload,
  StreakResponse,
  TimelineResponse,
  UpdateReadingSessionPayload,
} from "./types";

export async function getActiveSessions(): Promise<ReadingSessionResponse[]> {
  const { data } = await apiClient.get("/me/reading/active");
  return data;
}

export async function getSessions(
  params: ReadingSessionListParams = {},
): Promise<ReadingSessionResponse[]> {
  const { data } = await apiClient.get("/me/reading/sessions", { params });
  return data;
}

export async function startSession(
  payload: CreateReadingSessionPayload,
): Promise<ReadingSessionResponse> {
  const { data } = await apiClient.post("/me/reading/start", payload);
  return data;
}

export async function stopSession(
  payload: StopReadingSessionPayload,
): Promise<ReadingSessionResponse> {
  const { data } = await apiClient.post("/me/reading/stop", payload);
  return data;
}

export async function updateSession(
  sessionId: string,
  payload: UpdateReadingSessionPayload,
): Promise<ReadingSessionResponse> {
  const { data } = await apiClient.patch(`/me/reading/sessions/${sessionId}`, payload);
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/me/reading/sessions/${sessionId}`);
}

export async function getStats(
  period: ReadingStatsPeriod = "month",
): Promise<ReadingStatsResponse> {
  const { data } = await apiClient.get("/me/reading/stats", { params: { period } });
  return data;
}

export async function getStreak(): Promise<StreakResponse> {
  const { data } = await apiClient.get("/me/reading/streak");
  return data;
}

export async function getTimeline(fromDate: string, toDate: string): Promise<TimelineResponse> {
  const { data } = await apiClient.get("/me/reading/timeline", {
    params: { from_date: fromDate, to_date: toDate },
  });
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/reading.test.ts`
Expected: PASS, all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/api/reading.ts lib/api/reading.test.ts
git commit -m "feat(reading): add reading API client"
```

---

### Task 3: useReading TanStack Query hooks

**Files:**

- Create: `hooks/useReading.ts`
- Create: `hooks/useReading.test.tsx`

**Interfaces:**

- Consumes: all functions from Task 2's `lib/api/reading.ts`; types from Task 1.
- Produces: `useActiveSessions()`, `useSessions(params?)`, `useStartSession()`, `useStopSession()`, `useUpdateSession()`, `useDeleteSession()`, `useReadingStats(period?)`, `useReadingStreak()`, `useReadingTimeline(fromDate, toDate)`. Query keys: `["reading", "active"]`, `["reading", "sessions", params]`, `["reading", "stats", period]`, `["reading", "streak"]`, `["reading", "timeline", fromDate, toDate]` — later tasks (components/page) key their `invalidateQueries` calls and `useQuery`/`isPending` reads off these exact keys.

- [ ] **Step 1: Write the failing test**

Create `hooks/useReading.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useReading.test.tsx`
Expected: FAIL — `Cannot find module './useReading'`.

- [ ] **Step 3: Write the implementation**

Create `hooks/useReading.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@/lib/api/reading";
import type {
  CreateReadingSessionPayload,
  ReadingSessionListParams,
  ReadingStatsPeriod,
  StopReadingSessionPayload,
  UpdateReadingSessionPayload,
} from "@/lib/api/types";

export function useActiveSessions() {
  return useQuery({
    queryKey: ["reading", "active"],
    queryFn: getActiveSessions,
    refetchOnWindowFocus: true,
  });
}

export function useSessions(params: ReadingSessionListParams = {}) {
  return useQuery({
    queryKey: ["reading", "sessions", params],
    queryFn: () => getSessions(params),
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReadingSessionPayload) => startSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "active"] });
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StopReadingSessionPayload) => stopSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "active"] });
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      payload,
    }: {
      sessionId: string;
      payload: UpdateReadingSessionPayload;
    }) => updateSession(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reading", "sessions"] });
    },
  });
}

export function useReadingStats(period: ReadingStatsPeriod = "month") {
  return useQuery({
    queryKey: ["reading", "stats", period],
    queryFn: () => getStats(period),
  });
}

export function useReadingStreak() {
  return useQuery({
    queryKey: ["reading", "streak"],
    queryFn: getStreak,
  });
}

export function useReadingTimeline(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["reading", "timeline", fromDate, toDate],
    queryFn: () => getTimeline(fromDate, toDate),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useReading.test.tsx`
Expected: PASS, all 9 describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add hooks/useReading.ts hooks/useReading.test.tsx
git commit -m "feat(reading): add useReading TanStack Query hooks"
```

---

### Task 4: i18n strings for the reading domain

**Files:**

- Modify: `messages/en.json`
- Modify: `messages/uk.json`

**Interfaces:**

- Consumes: nothing.
- Produces: a top-level `"reading"` namespace with keys every component task below reads via `useTranslations("reading.<subkey>")`. Exact key paths listed in Step 1 — later tasks must use these paths verbatim.

- [ ] **Step 1: Add the `reading` namespace to `messages/en.json`**

Open `messages/en.json`, and add a new top-level `"reading"` key (alongside the existing `"share"` key) with this exact structure:

```json
"reading": {
  "pageTitle": "Reading",
  "activeSection": {
    "title": "Currently reading",
    "empty": "You're not reading anything right now.",
    "startAction": "Start a session",
    "stopAction": "Stop"
  },
  "startForm": {
    "title": "Start reading",
    "releaseLabel": "Book",
    "releasePlaceholder": "Choose a book from your library",
    "positionStartLabel": "Starting position (optional)",
    "positionUnitLabel": "Position unit",
    "unit": {
      "page": "Page",
      "percent": "Percent",
      "location": "Location",
      "timestamp": "Timestamp"
    },
    "submit": "Start",
    "submitting": "Starting..."
  },
  "stopForm": {
    "title": "Stop reading",
    "positionEndLabel": "Ending position (optional)",
    "notesLabel": "Notes (optional)",
    "submit": "Stop",
    "submitting": "Stopping..."
  },
  "history": {
    "title": "Session history",
    "empty": "No reading sessions yet.",
    "loading": "Loading sessions...",
    "editAction": "Edit",
    "deleteAction": "Delete",
    "deleteConfirmTitle": "Delete this session?",
    "deleteConfirmDescription": "This can't be undone.",
    "confirmDelete": "Delete"
  },
  "editForm": {
    "title": "Edit session",
    "startedAtLabel": "Started at",
    "endedAtLabel": "Ended at",
    "positionStartLabel": "Starting position",
    "positionEndLabel": "Ending position",
    "positionUnitLabel": "Position unit",
    "pagesReadLabel": "Pages read",
    "notesLabel": "Notes",
    "submit": "Save changes",
    "submitting": "Saving..."
  },
  "stats": {
    "title": "Stats",
    "periodLabel": "Period",
    "period": {
      "week": "This week",
      "month": "This month",
      "year": "This year",
      "all": "All time"
    },
    "totalMinutes": "Total minutes",
    "totalSessions": "Sessions",
    "uniqueBooks": "Unique books",
    "totalPages": "Pages read",
    "loadError": "Unable to load stats right now."
  },
  "streak": {
    "title": "Streak",
    "current": "Current streak",
    "longest": "Longest streak",
    "days": "{count, plural, one {# day} other {# days}}",
    "loadError": "Unable to load streak right now."
  },
  "timeline": {
    "title": "Activity",
    "heatmapTitle": "Reading activity",
    "chartTitle": "Minutes per day",
    "empty": "No reading activity in this range yet.",
    "loadError": "Unable to load activity right now."
  },
  "errors": {
    "generic": "Something went wrong. Please try again."
  }
}
```

- [ ] **Step 2: Add the matching `reading` namespace to `messages/uk.json`**

Add the same key structure to `messages/uk.json` with Ukrainian copy:

```json
"reading": {
  "pageTitle": "Читання",
  "activeSection": {
    "title": "Зараз читаю",
    "empty": "Зараз ви нічого не читаєте.",
    "startAction": "Почати сесію",
    "stopAction": "Завершити"
  },
  "startForm": {
    "title": "Почати читання",
    "releaseLabel": "Книга",
    "releasePlaceholder": "Виберіть книгу зі своєї бібліотеки",
    "positionStartLabel": "Початкова позиція (необов'язково)",
    "positionUnitLabel": "Одиниця позиції",
    "unit": {
      "page": "Сторінка",
      "percent": "Відсоток",
      "location": "Місце",
      "timestamp": "Час"
    },
    "submit": "Почати",
    "submitting": "Починаємо..."
  },
  "stopForm": {
    "title": "Завершити читання",
    "positionEndLabel": "Кінцева позиція (необов'язково)",
    "notesLabel": "Нотатки (необов'язково)",
    "submit": "Завершити",
    "submitting": "Завершуємо..."
  },
  "history": {
    "title": "Історія сесій",
    "empty": "Ще немає сесій читання.",
    "loading": "Завантаження сесій...",
    "editAction": "Редагувати",
    "deleteAction": "Видалити",
    "deleteConfirmTitle": "Видалити цю сесію?",
    "deleteConfirmDescription": "Цю дію не можна скасувати.",
    "confirmDelete": "Видалити"
  },
  "editForm": {
    "title": "Редагувати сесію",
    "startedAtLabel": "Початок",
    "endedAtLabel": "Кінець",
    "positionStartLabel": "Початкова позиція",
    "positionEndLabel": "Кінцева позиція",
    "positionUnitLabel": "Одиниця позиції",
    "pagesReadLabel": "Прочитано сторінок",
    "notesLabel": "Нотатки",
    "submit": "Зберегти зміни",
    "submitting": "Зберігаємо..."
  },
  "stats": {
    "title": "Статистика",
    "periodLabel": "Період",
    "period": {
      "week": "Цей тиждень",
      "month": "Цей місяць",
      "year": "Цей рік",
      "all": "Весь час"
    },
    "totalMinutes": "Всього хвилин",
    "totalSessions": "Сесії",
    "uniqueBooks": "Унікальні книги",
    "totalPages": "Прочитано сторінок",
    "loadError": "Не вдалося завантажити статистику."
  },
  "streak": {
    "title": "Серія",
    "current": "Поточна серія",
    "longest": "Найдовша серія",
    "days": "{count, plural, one {# день} few {# дні} many {# днів} other {# дня}}",
    "loadError": "Не вдалося завантажити серію."
  },
  "timeline": {
    "title": "Активність",
    "heatmapTitle": "Активність читання",
    "chartTitle": "Хвилин на день",
    "empty": "У цьому діапазоні ще немає активності.",
    "loadError": "Не вдалося завантажити активність."
  },
  "errors": {
    "generic": "Щось пішло не так. Спробуйте ще раз."
  }
}
```

- [ ] **Step 3: Validate both JSON files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/uk.json', 'utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/uk.json
git commit -m "feat(reading): add reading domain i18n strings"
```

---

### Task 5: ActiveSessionCard component

**Files:**

- Create: `components/reading/active-session-card.tsx`
- Create: `components/reading/active-session-card.stories.tsx`
- Create: `components/reading/active-session-card.test.tsx`

**Interfaces:**

- Consumes: `ReadingSessionResponse` (Task 1); no hooks directly — takes `session` and an `onStop` callback as props (parent page wires the mutation).
- Produces: `ActiveSessionCard({ session, onStop }: { session: ReadingSessionResponse; onStop: () => void })` — used by Task 10 (page).

- [ ] **Step 1: Write the failing test**

Create `components/reading/active-session-card.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { ActiveSessionCard } from "./active-session-card";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: null,
  position_start: 10,
  position_end: null,
  position_unit: "page",
  pages_read: null,
  notes: null,
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T09:00:00Z",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ActiveSessionCard", () => {
  it("shows the release id and a stop button", () => {
    renderWithIntl(<ActiveSessionCard session={session} onStop={() => {}} />);
    expect(screen.getByText("r1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("calls onStop when the stop button is clicked", async () => {
    const onStop = vi.fn();
    renderWithIntl(<ActiveSessionCard session={session} onStop={onStop} />);
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/reading/active-session-card.test.tsx`
Expected: FAIL — `Cannot find module './active-session-card'`.

- [ ] **Step 3: Write the implementation**

Create `components/reading/active-session-card.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReadingSessionResponse } from "@/lib/api/types";

export function ActiveSessionCard({
  session,
  onStop,
}: {
  session: ReadingSessionResponse;
  onStop: () => void;
}) {
  const t = useTranslations("reading.activeSection");
  const startedAt = new Date(session.started_at);

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{session.release_id}</p>
          <p className="text-muted-foreground text-xs">
            {startedAt.toLocaleString()}
          </p>
        </div>
        <Button size="sm" onClick={onStop}>
          {t("stopAction")}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/reading/active-session-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook story**

Create `components/reading/active-session-card.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActiveSessionCard } from "./active-session-card";

const meta: Meta<typeof ActiveSessionCard> = {
  title: "Reading/ActiveSessionCard",
  component: ActiveSessionCard,
};
export default meta;

type Story = StoryObj<typeof ActiveSessionCard>;

export const Default: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "The Library of Babel",
      started_at: new Date().toISOString(),
      ended_at: null,
      position_start: 10,
      position_end: null,
      position_unit: "page",
      pages_read: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    onStop: () => {},
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/reading/active-session-card.tsx components/reading/active-session-card.stories.tsx components/reading/active-session-card.test.tsx
git commit -m "feat(reading): add ActiveSessionCard component"
```

---

### Task 6: StartSessionForm component

**Files:**

- Create: `components/reading/start-session-form.tsx`
- Create: `components/reading/start-session-form.stories.tsx`
- Create: `components/reading/start-session-form.test.tsx`

**Interfaces:**

- Consumes: `useStartSession()` (Task 3); `useLibrary()` from `@/hooks/useStatuses` (existing Block 3 hook — returns `Page<BookStatusResponse>`, filter to entries where `release_id` is not null for the picker options); `PositionUnit` type (Task 1); `extractErrorMessage` from `@/lib/api/errors`.
- Produces: `StartSessionForm({ releaseId, onSuccess }: { releaseId?: string; onSuccess: () => void })` — if `releaseId` is passed (e.g. from a future book-detail page), skip the picker and use it directly; otherwise render the picker from `useLibrary()`. Used by Task 10 (page).

- [ ] **Step 1: Write the failing test**

Create `components/reading/start-session-form.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { StartSessionForm } from "./start-session-form";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("StartSessionForm", () => {
  it("starts a session for a preselected releaseId without showing a picker", async () => {
    const onSuccess = vi.fn();
    server.use(
      http.post("/api/me/reading/start", () =>
        HttpResponse.json({ id: "s1", release_id: "r1" }, { status: 201 }),
      ),
    );
    renderWithProviders(<StartSessionForm releaseId="r1" onSuccess={onSuccess} />);
    expect(screen.queryByText("Choose a book from your library")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });

  it("shows a form-level error when start fails", async () => {
    server.use(
      http.post("/api/me/reading/start", () =>
        HttpResponse.json({ detail: "Conflict" }, { status: 409 }),
      ),
    );
    renderWithProviders(<StartSessionForm releaseId="r1" onSuccess={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(screen.getByText("Conflict")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/reading/start-session-form.test.tsx`
Expected: FAIL — `Cannot find module './start-session-form'`.

- [ ] **Step 3: Write the implementation**

Create `components/reading/start-session-form.tsx`:

```typescript
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useStartSession } from "@/hooks/useReading";
import { useLibrary } from "@/hooks/useStatuses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractErrorMessage } from "@/lib/api/errors";
import type { PositionUnit } from "@/lib/api/types";

const POSITION_UNITS: PositionUnit[] = ["page", "percent", "location", "timestamp"];

export function StartSessionForm({
  releaseId,
  onSuccess,
}: {
  releaseId?: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("reading.startForm");
  const tUnit = useTranslations("reading.startForm.unit");
  const [selectedReleaseId, setSelectedReleaseId] = React.useState(releaseId ?? "");
  const [positionStart, setPositionStart] = React.useState("");
  const [positionUnit, setPositionUnit] = React.useState<PositionUnit | "">("");

  const library = useLibrary();
  const startSession = useStartSession();
  const releaseOptions = releaseId
    ? []
    : (library.data?.items ?? []).filter(
        (item): item is typeof item & { release_id: string } => item.release_id !== null,
      );

  function handleSubmit() {
    startSession.mutate(
      {
        release_id: selectedReleaseId,
        position_start: positionStart ? Number(positionStart) : null,
        position_unit: positionUnit || null,
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!releaseId && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t("releaseLabel")}</label>
          <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
            <SelectTrigger>
              <SelectValue placeholder={t("releasePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {releaseOptions.map((item) => (
                <SelectItem key={item.release_id} value={item.release_id}>
                  {item.release_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="position-start" className="text-sm font-medium">
          {t("positionStartLabel")}
        </label>
        <Input
          id="position-start"
          type="number"
          value={positionStart}
          onChange={(e) => setPositionStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("positionUnitLabel")}</label>
        <Select value={positionUnit} onValueChange={(v) => setPositionUnit(v as PositionUnit)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITION_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit}>
                {tUnit(unit)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {startSession.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(startSession.error)}</p>
      )}
      <Button
        disabled={startSession.isPending || !selectedReleaseId}
        onClick={handleSubmit}
      >
        {startSession.isPending ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/reading/start-session-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook story**

Create `components/reading/start-session-form.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StartSessionForm } from "./start-session-form";

const meta: Meta<typeof StartSessionForm> = {
  title: "Reading/StartSessionForm",
  component: StartSessionForm,
};
export default meta;

type Story = StoryObj<typeof StartSessionForm>;

export const PreselectedRelease: Story = {
  args: { releaseId: "r1", onSuccess: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/reading/start-session-form.tsx components/reading/start-session-form.stories.tsx components/reading/start-session-form.test.tsx
git commit -m "feat(reading): add StartSessionForm component"
```

---

### Task 7: StopSessionForm + SessionHistoryList/SessionHistoryItem components

**Files:**

- Create: `components/reading/stop-session-form.tsx`
- Create: `components/reading/stop-session-form.stories.tsx`
- Create: `components/reading/stop-session-form.test.tsx`
- Create: `components/reading/session-history-item.tsx`
- Create: `components/reading/session-history-item.stories.tsx`
- Create: `components/reading/session-history-item.test.tsx`
- Create: `components/reading/session-history-list.tsx`
- Create: `components/reading/session-history-list.stories.tsx`
- Create: `components/reading/session-history-list.test.tsx`

**Interfaces:**

- Consumes: `useStopSession()`, `useUpdateSession()`, `useDeleteSession()` (Task 3); `ReadingSessionResponse` (Task 1); shadcn `Dialog`/`AlertDialog`-style confirm pattern (this repo uses `Dialog` + a confirm button, per `components/statuses/return-confirm-dialog.tsx` — no separate `AlertDialog` primitive exists, reuse `Dialog`).
- Produces: `StopSessionForm({ releaseId, onSuccess }: { releaseId: string; onSuccess: () => void })`, `SessionHistoryItem({ session, onEdit, onDelete }: { session: ReadingSessionResponse; onEdit: () => void; onDelete: () => void })`, `SessionHistoryList({ sessions, onEdit, onDelete }: { sessions: ReadingSessionResponse[]; onEdit: (session: ReadingSessionResponse) => void; onDelete: (session: ReadingSessionResponse) => void })`. All three consumed by Task 10 (page).

- [ ] **Step 1: Write the failing tests**

Create `components/reading/stop-session-form.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { StopSessionForm } from "./stop-session-form";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("StopSessionForm", () => {
  it("stops a session", async () => {
    const onSuccess = vi.fn();
    server.use(
      http.post("/api/me/reading/stop", () =>
        HttpResponse.json({ id: "s1", ended_at: "2026-07-22T10:00:00Z" }),
      ),
    );
    renderWithProviders(<StopSessionForm releaseId="r1" onSuccess={onSuccess} />);
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
```

Create `components/reading/session-history-item.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SessionHistoryItem } from "./session-history-item";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: "2026-07-22T10:00:00Z",
  position_start: 1,
  position_end: 20,
  position_unit: "page",
  pages_read: 19,
  notes: "Good chapter",
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T10:00:00Z",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SessionHistoryItem", () => {
  it("shows release, pages read, and notes", () => {
    renderWithIntl(
      <SessionHistoryItem session={session} onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("r1")).toBeInTheDocument();
    expect(screen.getByText("Good chapter")).toBeInTheDocument();
  });

  it("calls onEdit and onDelete", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderWithIntl(
      <SessionHistoryItem session={session} onEdit={onEdit} onDelete={onDelete} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
```

Create `components/reading/session-history-list.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SessionHistoryList } from "./session-history-list";
import type { ReadingSessionResponse } from "@/lib/api/types";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SessionHistoryList", () => {
  it("shows the empty state when there are no sessions", () => {
    renderWithIntl(<SessionHistoryList sessions={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("No reading sessions yet.")).toBeInTheDocument();
  });

  it("renders one item per session", () => {
    const sessions: ReadingSessionResponse[] = [
      {
        id: "s1",
        user_id: "u1",
        release_id: "r1",
        started_at: "2026-07-22T09:00:00Z",
        ended_at: "2026-07-22T10:00:00Z",
        position_start: null,
        position_end: null,
        position_unit: null,
        pages_read: 10,
        notes: null,
        created_at: "2026-07-22T09:00:00Z",
        updated_at: "2026-07-22T10:00:00Z",
      },
    ];
    renderWithIntl(<SessionHistoryList sessions={sessions} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("r1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run components/reading/stop-session-form.test.tsx components/reading/session-history-item.test.tsx components/reading/session-history-list.test.tsx`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write the implementations**

Create `components/reading/stop-session-form.tsx`:

```typescript
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useStopSession } from "@/hooks/useReading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";

export function StopSessionForm({
  releaseId,
  onSuccess,
}: {
  releaseId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("reading.stopForm");
  const [positionEnd, setPositionEnd] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const stopSession = useStopSession();

  function handleSubmit() {
    stopSession.mutate(
      {
        release_id: releaseId,
        position_end: positionEnd ? Number(positionEnd) : null,
        notes: notes || null,
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="position-end" className="text-sm font-medium">
          {t("positionEndLabel")}
        </label>
        <Input
          id="position-end"
          type="number"
          value={positionEnd}
          onChange={(e) => setPositionEnd(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="stop-notes" className="text-sm font-medium">
          {t("notesLabel")}
        </label>
        <Textarea id="stop-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {stopSession.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(stopSession.error)}</p>
      )}
      <Button disabled={stopSession.isPending} onClick={handleSubmit}>
        {stopSession.isPending ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
```

Create `components/reading/session-history-item.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReadingSessionResponse } from "@/lib/api/types";

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return "—";
  const minutes = Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000);
  return `${minutes} min`;
}

export function SessionHistoryItem({
  session,
  onEdit,
  onDelete,
}: {
  session: ReadingSessionResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("reading.history");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{session.release_id}</p>
          <p className="text-muted-foreground text-xs">
            {formatDuration(session.started_at, session.ended_at)}
            {session.pages_read !== null ? ` · ${session.pages_read} pages` : ""}
          </p>
          {session.notes && <p className="text-muted-foreground text-xs">{session.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {t("editAction")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            {t("deleteAction")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

Create `components/reading/session-history-list.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { SessionHistoryItem } from "./session-history-item";
import type { ReadingSessionResponse } from "@/lib/api/types";

export function SessionHistoryList({
  sessions,
  onEdit,
  onDelete,
}: {
  sessions: ReadingSessionResponse[];
  onEdit: (session: ReadingSessionResponse) => void;
  onDelete: (session: ReadingSessionResponse) => void;
}) {
  const t = useTranslations("reading.history");

  if (sessions.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {sessions.map((session) => (
        <SessionHistoryItem
          key={session.id}
          session={session}
          onEdit={() => onEdit(session)}
          onDelete={() => onDelete(session)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run components/reading/stop-session-form.test.tsx components/reading/session-history-item.test.tsx components/reading/session-history-list.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook stories**

Create `components/reading/stop-session-form.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StopSessionForm } from "./stop-session-form";

const meta: Meta<typeof StopSessionForm> = {
  title: "Reading/StopSessionForm",
  component: StopSessionForm,
};
export default meta;

type Story = StoryObj<typeof StopSessionForm>;

export const Default: Story = {
  args: { releaseId: "r1", onSuccess: () => {} },
};
```

Create `components/reading/session-history-item.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionHistoryItem } from "./session-history-item";

const meta: Meta<typeof SessionHistoryItem> = {
  title: "Reading/SessionHistoryItem",
  component: SessionHistoryItem,
};
export default meta;

type Story = StoryObj<typeof SessionHistoryItem>;

export const Default: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "The Library of Babel",
      started_at: "2026-07-22T09:00:00Z",
      ended_at: "2026-07-22T10:00:00Z",
      position_start: 1,
      position_end: 20,
      position_unit: "page",
      pages_read: 19,
      notes: "Great chapter",
      created_at: "2026-07-22T09:00:00Z",
      updated_at: "2026-07-22T10:00:00Z",
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};
```

Create `components/reading/session-history-list.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionHistoryList } from "./session-history-list";

const meta: Meta<typeof SessionHistoryList> = {
  title: "Reading/SessionHistoryList",
  component: SessionHistoryList,
};
export default meta;

type Story = StoryObj<typeof SessionHistoryList>;

export const Empty: Story = {
  args: { sessions: [], onEdit: () => {}, onDelete: () => {} },
};

export const Populated: Story = {
  args: {
    sessions: [
      {
        id: "s1",
        user_id: "u1",
        release_id: "The Library of Babel",
        started_at: "2026-07-22T09:00:00Z",
        ended_at: "2026-07-22T10:00:00Z",
        position_start: 1,
        position_end: 20,
        position_unit: "page",
        pages_read: 19,
        notes: null,
        created_at: "2026-07-22T09:00:00Z",
        updated_at: "2026-07-22T10:00:00Z",
      },
    ],
    onEdit: () => {},
    onDelete: () => {},
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/reading/stop-session-form.tsx components/reading/stop-session-form.stories.tsx components/reading/stop-session-form.test.tsx components/reading/session-history-item.tsx components/reading/session-history-item.stories.tsx components/reading/session-history-item.test.tsx components/reading/session-history-list.tsx components/reading/session-history-list.stories.tsx components/reading/session-history-list.test.tsx
git commit -m "feat(reading): add StopSessionForm, SessionHistoryItem, SessionHistoryList components"
```

---

### Task 8: EditSessionForm + delete-confirm dialog

**Files:**

- Create: `components/reading/edit-session-form.tsx`
- Create: `components/reading/edit-session-form.stories.tsx`
- Create: `components/reading/edit-session-form.test.tsx`
- Create: `components/reading/delete-session-dialog.tsx`
- Create: `components/reading/delete-session-dialog.stories.tsx`
- Create: `components/reading/delete-session-dialog.test.tsx`

**Interfaces:**

- Consumes: `useUpdateSession()`, `useDeleteSession()` (Task 3); `ReadingSessionResponse`, `UpdateReadingSessionPayload` (Task 1).
- Produces: `EditSessionForm({ session, onSuccess }: { session: ReadingSessionResponse; onSuccess: () => void })`, `DeleteSessionDialog({ session, open, onOpenChange }: { session: ReadingSessionResponse; open: boolean; onOpenChange: (open: boolean) => void })` — both consumed by Task 10 (page).

- [ ] **Step 1: Write the failing tests**

Create `components/reading/edit-session-form.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { EditSessionForm } from "./edit-session-form";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: "2026-07-22T10:00:00Z",
  position_start: 1,
  position_end: 20,
  position_unit: "page",
  pages_read: 19,
  notes: "Old note",
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T10:00:00Z",
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("EditSessionForm", () => {
  it("pre-fills fields from the session and submits an update", async () => {
    const onSuccess = vi.fn();
    server.use(
      http.patch("/api/me/reading/sessions/s1", () =>
        HttpResponse.json({ ...session, notes: "New note" }),
      ),
    );
    renderWithProviders(<EditSessionForm session={session} onSuccess={onSuccess} />);
    expect(screen.getByDisplayValue("Old note")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Notes"));
    await userEvent.type(screen.getByLabelText("Notes"), "New note");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
```

Create `components/reading/delete-session-dialog.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { DeleteSessionDialog } from "./delete-session-dialog";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: null,
  position_start: null,
  position_end: null,
  position_unit: null,
  pages_read: null,
  notes: null,
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T09:00:00Z",
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("DeleteSessionDialog", () => {
  it("deletes the session on confirm", async () => {
    server.use(
      http.delete("/api/me/reading/sessions/s1", () => new HttpResponse(null, { status: 204 })),
    );
    renderWithProviders(<DeleteSessionDialog session={session} open={true} onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Delete this session?")).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run components/reading/edit-session-form.test.tsx components/reading/delete-session-dialog.test.tsx`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write the implementations**

Create `components/reading/edit-session-form.tsx`:

```typescript
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useUpdateSession } from "@/hooks/useReading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ReadingSessionResponse } from "@/lib/api/types";

export function EditSessionForm({
  session,
  onSuccess,
}: {
  session: ReadingSessionResponse;
  onSuccess: () => void;
}) {
  const t = useTranslations("reading.editForm");
  const [positionStart, setPositionStart] = React.useState(
    session.position_start?.toString() ?? "",
  );
  const [positionEnd, setPositionEnd] = React.useState(session.position_end?.toString() ?? "");
  const [pagesRead, setPagesRead] = React.useState(session.pages_read?.toString() ?? "");
  const [notes, setNotes] = React.useState(session.notes ?? "");

  const updateSession = useUpdateSession();

  function handleSubmit() {
    updateSession.mutate(
      {
        sessionId: session.id,
        payload: {
          position_start: positionStart ? Number(positionStart) : null,
          position_end: positionEnd ? Number(positionEnd) : null,
          pages_read: pagesRead ? Number(pagesRead) : null,
          notes: notes || null,
        },
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-position-start" className="text-sm font-medium">
          {t("positionStartLabel")}
        </label>
        <Input
          id="edit-position-start"
          type="number"
          value={positionStart}
          onChange={(e) => setPositionStart(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-position-end" className="text-sm font-medium">
          {t("positionEndLabel")}
        </label>
        <Input
          id="edit-position-end"
          type="number"
          value={positionEnd}
          onChange={(e) => setPositionEnd(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-pages-read" className="text-sm font-medium">
          {t("pagesReadLabel")}
        </label>
        <Input
          id="edit-pages-read"
          type="number"
          value={pagesRead}
          onChange={(e) => setPagesRead(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-notes" className="text-sm font-medium">
          {t("notesLabel")}
        </label>
        <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      {updateSession.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(updateSession.error)}</p>
      )}
      <Button disabled={updateSession.isPending} onClick={handleSubmit}>
        {updateSession.isPending ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}
```

Create `components/reading/delete-session-dialog.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useDeleteSession } from "@/hooks/useReading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";
import type { ReadingSessionResponse } from "@/lib/api/types";

export function DeleteSessionDialog({
  session,
  open,
  onOpenChange,
}: {
  session: ReadingSessionResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("reading.history");
  const deleteSession = useDeleteSession();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("deleteConfirmDescription")}</DialogDescription>
        </DialogHeader>
        {deleteSession.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(deleteSession.error)}</p>
        )}
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={deleteSession.isPending}
            onClick={() =>
              deleteSession.mutate(session.id, { onSuccess: () => onOpenChange(false) })
            }
          >
            {t("confirmDelete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run components/reading/edit-session-form.test.tsx components/reading/delete-session-dialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook stories**

Create `components/reading/edit-session-form.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditSessionForm } from "./edit-session-form";

const meta: Meta<typeof EditSessionForm> = {
  title: "Reading/EditSessionForm",
  component: EditSessionForm,
};
export default meta;

type Story = StoryObj<typeof EditSessionForm>;

export const Default: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "r1",
      started_at: "2026-07-22T09:00:00Z",
      ended_at: "2026-07-22T10:00:00Z",
      position_start: 1,
      position_end: 20,
      position_unit: "page",
      pages_read: 19,
      notes: "Great chapter",
      created_at: "2026-07-22T09:00:00Z",
      updated_at: "2026-07-22T10:00:00Z",
    },
    onSuccess: () => {},
  },
};
```

Create `components/reading/delete-session-dialog.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DeleteSessionDialog } from "./delete-session-dialog";

const meta: Meta<typeof DeleteSessionDialog> = {
  title: "Reading/DeleteSessionDialog",
  component: DeleteSessionDialog,
};
export default meta;

type Story = StoryObj<typeof DeleteSessionDialog>;

export const Open: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "r1",
      started_at: "2026-07-22T09:00:00Z",
      ended_at: null,
      position_start: null,
      position_end: null,
      position_unit: null,
      pages_read: null,
      notes: null,
      created_at: "2026-07-22T09:00:00Z",
      updated_at: "2026-07-22T09:00:00Z",
    },
    open: true,
    onOpenChange: () => {},
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/reading/edit-session-form.tsx components/reading/edit-session-form.stories.tsx components/reading/edit-session-form.test.tsx components/reading/delete-session-dialog.tsx components/reading/delete-session-dialog.stories.tsx components/reading/delete-session-dialog.test.tsx
git commit -m "feat(reading): add EditSessionForm and DeleteSessionDialog components"
```

---

### Task 9: ReadingStatsSummary + ReadingStreakBadge components

**Files:**

- Create: `components/reading/reading-stats-summary.tsx`
- Create: `components/reading/reading-stats-summary.stories.tsx`
- Create: `components/reading/reading-stats-summary.test.tsx`
- Create: `components/reading/reading-streak-badge.tsx`
- Create: `components/reading/reading-streak-badge.stories.tsx`
- Create: `components/reading/reading-streak-badge.test.tsx`

**Interfaces:**

- Consumes: `useReadingStats(period)`, `useReadingStreak()` (Task 3); `ReadingStatsPeriod` (Task 1); `Skeleton` from `@/components/ui/skeleton`.
- Produces: `ReadingStatsSummary({ period }: { period: ReadingStatsPeriod })`, `ReadingStreakBadge()` — both consumed by Task 10 (page). Both handle `isPending` (Skeleton), a true 200-zero-value empty state, and a distinct error state per the spec's error-handling rule.

- [ ] **Step 1: Write the failing tests**

Create `components/reading/reading-stats-summary.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { ReadingStatsSummary } from "./reading-stats-summary";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReadingStatsSummary", () => {
  it("shows stat tiles once loaded", async () => {
    server.use(
      http.get("/api/me/reading/stats", () =>
        HttpResponse.json({ total_minutes: 120, total_sessions: 4, unique_books: 2, total_pages: 80 }),
      ),
    );
    renderWithProviders(<ReadingStatsSummary period="month" />);
    await waitFor(() => expect(screen.getByText("120")).toBeInTheDocument());
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("shows a distinct error state on a 500", async () => {
    server.use(http.get("/api/me/reading/stats", () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<ReadingStatsSummary period="month" />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load stats right now.")).toBeInTheDocument(),
    );
  });
});
```

Create `components/reading/reading-streak-badge.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { ReadingStreakBadge } from "./reading-streak-badge";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReadingStreakBadge", () => {
  it("shows current and longest streak", async () => {
    server.use(
      http.get("/api/me/reading/streak", () =>
        HttpResponse.json({ current_streak_days: 3, longest_streak_days: 7 }),
      ),
    );
    renderWithProviders(<ReadingStreakBadge />);
    await waitFor(() => expect(screen.getByText("3 days")).toBeInTheDocument());
    expect(screen.getByText("7 days")).toBeInTheDocument();
  });

  it("shows a distinct error state on a 500", async () => {
    server.use(http.get("/api/me/reading/streak", () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<ReadingStreakBadge />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load streak right now.")).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run components/reading/reading-stats-summary.test.tsx components/reading/reading-streak-badge.test.tsx`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write the implementations**

Create `components/reading/reading-stats-summary.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadingStats } from "@/hooks/useReading";
import type { ReadingStatsPeriod } from "@/lib/api/types";

export function ReadingStatsSummary({ period }: { period: ReadingStatsPeriod }) {
  const t = useTranslations("reading.stats");
  const { data, isPending, isError } = useReadingStats(period);

  if (isPending) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">{t("loadError")}</p>;
  }

  const tiles = [
    { label: t("totalMinutes"), value: data.total_minutes },
    { label: t("totalSessions"), value: data.total_sessions },
    { label: t("uniqueBooks"), value: data.unique_books },
    { label: t("totalPages"), value: data.total_pages },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="flex flex-col gap-1">
            <p className="text-2xl font-semibold">{tile.value}</p>
            <p className="text-muted-foreground text-xs">{tile.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

Create `components/reading/reading-streak-badge.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadingStreak } from "@/hooks/useReading";

export function ReadingStreakBadge() {
  const t = useTranslations("reading.streak");
  const { data, isPending, isError } = useReadingStreak();

  if (isPending) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">{t("loadError")}</p>;
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">{t("current")}</p>
          <p className="text-lg font-semibold">
            {t("days", { count: data.current_streak_days })}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-xs">{t("longest")}</p>
          <p className="text-lg font-semibold">
            {t("days", { count: data.longest_streak_days })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run components/reading/reading-stats-summary.test.tsx components/reading/reading-streak-badge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook stories**

Create `components/reading/reading-stats-summary.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReadingStatsSummary } from "./reading-stats-summary";

const meta: Meta<typeof ReadingStatsSummary> = {
  title: "Reading/ReadingStatsSummary",
  component: ReadingStatsSummary,
};
export default meta;

type Story = StoryObj<typeof ReadingStatsSummary>;

export const Default: Story = {
  args: { period: "month" },
};
```

Create `components/reading/reading-streak-badge.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReadingStreakBadge } from "./reading-streak-badge";

const meta: Meta<typeof ReadingStreakBadge> = {
  title: "Reading/ReadingStreakBadge",
  component: ReadingStreakBadge,
};
export default meta;

type Story = StoryObj<typeof ReadingStreakBadge>;

export const Default: Story = {};
```

- [ ] **Step 6: Commit**

```bash
git add components/reading/reading-stats-summary.tsx components/reading/reading-stats-summary.stories.tsx components/reading/reading-stats-summary.test.tsx components/reading/reading-streak-badge.tsx components/reading/reading-streak-badge.stories.tsx components/reading/reading-streak-badge.test.tsx
git commit -m "feat(reading): add ReadingStatsSummary and ReadingStreakBadge components"
```

---

### Task 10: ReadingTimelineChart component (heatmap + bar chart)

**Files:**

- Create: `components/reading/reading-timeline-chart.tsx`
- Create: `components/reading/reading-timeline-chart.stories.tsx`
- Create: `components/reading/reading-timeline-chart.test.tsx`

**Interfaces:**

- Consumes: `useReadingTimeline(fromDate, toDate)` (Task 3); `TimelineEntry` (Task 1); `Skeleton`.
- Produces: `ReadingTimelineChart({ fromDate, toDate }: { fromDate: string; toDate: string })` — a calendar heatmap (single-hue sequential intensity, `--primary` at varying opacity — per `dataviz` skill, sequential = one hue light→dark, no legend needed since intensity is self-explanatory with a caption) plus a simple bar chart of `total_minutes` per day (single series → no legend, per `dataviz` skill's "single series needs no legend" rule) below it, both built as plain inline SVG/div elements (no new chart dependency, per spec's "do not over-design beyond these two chart types"). Consumed by Task 10 (page) — same task creates the page, so this is the last shared building block before wiring.

- [ ] **Step 1: Write the failing test**

Create `components/reading/reading-timeline-chart.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { ReadingTimelineChart } from "./reading-timeline-chart";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReadingTimelineChart", () => {
  it("shows the empty state when every day has zero minutes", async () => {
    server.use(
      http.get("/api/me/reading/timeline", () =>
        HttpResponse.json({
          items: [{ date: "2026-07-01", total_minutes: 0, sessions: 0, pages_read: 0 }],
        }),
      ),
    );
    renderWithProviders(<ReadingTimelineChart fromDate="2026-07-01" toDate="2026-07-01" />);
    await waitFor(() =>
      expect(screen.getByText("No reading activity in this range yet.")).toBeInTheDocument(),
    );
  });

  it("renders one bar per day when there is activity", async () => {
    server.use(
      http.get("/api/me/reading/timeline", () =>
        HttpResponse.json({
          items: [
            { date: "2026-07-01", total_minutes: 30, sessions: 1, pages_read: 5 },
            { date: "2026-07-02", total_minutes: 0, sessions: 0, pages_read: 0 },
          ],
        }),
      ),
    );
    renderWithProviders(<ReadingTimelineChart fromDate="2026-07-01" toDate="2026-07-02" />);
    await waitFor(() => expect(screen.getAllByTestId("timeline-day")).toHaveLength(2));
  });

  it("shows a distinct error state on a 500", async () => {
    server.use(http.get("/api/me/reading/timeline", () => HttpResponse.json({}, { status: 500 })));
    renderWithProviders(<ReadingTimelineChart fromDate="2026-07-01" toDate="2026-07-01" />);
    await waitFor(() =>
      expect(screen.getByText("Unable to load activity right now.")).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/reading/reading-timeline-chart.test.tsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `components/reading/reading-timeline-chart.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { useReadingTimeline } from "@/hooks/useReading";
import type { TimelineEntry } from "@/lib/api/types";

function intensity(minutes: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(1, minutes / max);
}

export function ReadingTimelineChart({
  fromDate,
  toDate,
}: {
  fromDate: string;
  toDate: string;
}) {
  const t = useTranslations("reading.timeline");
  const { data, isPending, isError } = useReadingTimeline(fromDate, toDate);

  if (isPending) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (isError) {
    return <p className="text-destructive text-sm">{t("loadError")}</p>;
  }

  const items: TimelineEntry[] = data.items;
  const hasActivity = items.some((item) => item.total_minutes > 0);
  const maxMinutes = Math.max(...items.map((item) => item.total_minutes), 0);

  if (!hasActivity) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-muted-foreground mb-2 text-xs">{t("heatmapTitle")}</p>
        <div className="flex flex-wrap gap-1">
          {items.map((item) => (
            <div
              key={item.date}
              data-testid="timeline-day"
              title={`${item.date}: ${item.total_minutes} min`}
              className="border-border size-4 rounded-sm border"
              style={{
                backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(
                  intensity(item.total_minutes, maxMinutes) * 100,
                )}%, transparent)`,
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs">{t("chartTitle")}</p>
        <svg viewBox={`0 0 ${items.length * 12} 60`} className="h-16 w-full" role="img">
          {items.map((item, index) => {
            const height = maxMinutes === 0 ? 0 : (item.total_minutes / maxMinutes) * 56;
            return (
              <rect
                key={item.date}
                x={index * 12}
                y={60 - height}
                width={8}
                height={height}
                rx={2}
                fill="var(--primary)"
              >
                <title>{`${item.date}: ${item.total_minutes} min`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/reading/reading-timeline-chart.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook story**

Create `components/reading/reading-timeline-chart.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReadingTimelineChart } from "./reading-timeline-chart";

const meta: Meta<typeof ReadingTimelineChart> = {
  title: "Reading/ReadingTimelineChart",
  component: ReadingTimelineChart,
};
export default meta;

type Story = StoryObj<typeof ReadingTimelineChart>;

export const Default: Story = {
  args: { fromDate: "2026-07-01", toDate: "2026-07-22" },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/reading/reading-timeline-chart.tsx components/reading/reading-timeline-chart.stories.tsx components/reading/reading-timeline-chart.test.tsx
git commit -m "feat(reading): add ReadingTimelineChart component (heatmap + bar chart)"
```

---

### Task 11: Reading dashboard page + header nav entry

**Files:**

- Create: `app/(app)/reading/page.tsx`
- Modify: `components/shell/header.tsx`
- Modify: `components/shell/header.test.tsx`

**Interfaces:**

- Consumes: every hook from Task 3 (`useActiveSessions`, `useSessions`, `useStopSession`); every component from Tasks 5-10 (`ActiveSessionCard`, `StartSessionForm`, `StopSessionForm`, `SessionHistoryList`, `EditSessionForm`, `DeleteSessionDialog`, `ReadingStatsSummary`, `ReadingStreakBadge`, `ReadingTimelineChart`); `Dialog`/`Tabs` from `components/ui`; `ReadingStatsPeriod` (Task 1).
- Produces: the `/reading` route, and a `Reading` link in the header nav pointing at it. Terminal task — nothing later depends on this.

- [ ] **Step 1: Add the `Reading` nav link to the header**

Read `components/shell/header.test.tsx` first to see the existing nav-link assertions, then add a new test case asserting the `Reading` link exists and points at `/reading` (follow the existing test's structure for `Browse`/`Collections` links in that same file).

- [ ] **Step 2: Run the header test to verify it fails**

Run: `pnpm vitest run components/shell/header.test.tsx`
Expected: FAIL on the new "Reading" link assertion.

- [ ] **Step 3: Add the link to `components/shell/header.tsx`**

In `components/shell/header.tsx`, inside the `<nav>` block (after the `Collections` link), add:

```typescript
<Link href="/reading" className="text-muted-foreground hover:text-foreground text-sm">
  Reading
</Link>
```

- [ ] **Step 4: Run the header test to verify it passes**

Run: `pnpm vitest run components/shell/header.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the reading dashboard page**

Create `app/(app)/reading/page.tsx`:

```typescript
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useActiveSessions, useSessions, useStopSession } from "@/hooks/useReading";
import { ActiveSessionCard } from "@/components/reading/active-session-card";
import { StartSessionForm } from "@/components/reading/start-session-form";
import { StopSessionForm } from "@/components/reading/stop-session-form";
import { SessionHistoryList } from "@/components/reading/session-history-list";
import { EditSessionForm } from "@/components/reading/edit-session-form";
import { DeleteSessionDialog } from "@/components/reading/delete-session-dialog";
import { ReadingStatsSummary } from "@/components/reading/reading-stats-summary";
import { ReadingStreakBadge } from "@/components/reading/reading-streak-badge";
import { ReadingTimelineChart } from "@/components/reading/reading-timeline-chart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReadingSessionResponse, ReadingStatsPeriod } from "@/lib/api/types";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function ReadingPage() {
  const t = useTranslations("reading");
  const tStats = useTranslations("reading.stats");
  const [period, setPeriod] = React.useState<ReadingStatsPeriod>("month");
  const [startDialogOpen, setStartDialogOpen] = React.useState(false);
  const [stoppingSession, setStoppingSession] = React.useState<ReadingSessionResponse | null>(
    null,
  );
  const [editingSession, setEditingSession] = React.useState<ReadingSessionResponse | null>(null);
  const [deletingSession, setDeletingSession] = React.useState<ReadingSessionResponse | null>(
    null,
  );

  const activeSessions = useActiveSessions();
  const sessions = useSessions();
  const stopSession = useStopSession();

  const today = React.useMemo(() => new Date(), []);
  const rangeStart = React.useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - 27);
    return toDateOnly(date);
  }, [today]);
  const rangeEnd = toDateOnly(today);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
        <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
          <DialogTrigger render={<Button />}>{t("activeSection.startAction")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("startForm.title")}</DialogTitle>
            </DialogHeader>
            <StartSessionForm onSuccess={() => setStartDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("activeSection.title")}</h2>
        {activeSessions.isPending && <Skeleton className="h-20 w-full" />}
        {!activeSessions.isPending && activeSessions.data?.length === 0 && (
          <p className="text-muted-foreground">{t("activeSection.empty")}</p>
        )}
        {activeSessions.data?.map((session) => (
          <ActiveSessionCard
            key={session.id}
            session={session}
            onStop={() => setStoppingSession(session)}
          />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{tStats("title")}</h2>
          <Select value={period} onValueChange={(value) => setPeriod(value as ReadingStatsPeriod)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{tStats("period.week")}</SelectItem>
              <SelectItem value="month">{tStats("period.month")}</SelectItem>
              <SelectItem value="year">{tStats("period.year")}</SelectItem>
              <SelectItem value="all">{tStats("period.all")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ReadingStatsSummary period={period} />
        <ReadingStreakBadge />
        <ReadingTimelineChart fromDate={rangeStart} toDate={rangeEnd} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("history.title")}</h2>
        {sessions.isPending && <Skeleton className="h-40 w-full" />}
        {!sessions.isPending && sessions.data && (
          <SessionHistoryList
            sessions={sessions.data}
            onEdit={setEditingSession}
            onDelete={setDeletingSession}
          />
        )}
      </section>

      <Dialog open={stoppingSession !== null} onOpenChange={(open) => !open && setStoppingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stopForm.title")}</DialogTitle>
          </DialogHeader>
          {stoppingSession && (
            <StopSessionForm
              releaseId={stoppingSession.release_id}
              onSuccess={() => setStoppingSession(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editingSession !== null} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editForm.title")}</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <EditSessionForm session={editingSession} onSuccess={() => setEditingSession(null)} />
          )}
        </DialogContent>
      </Dialog>

      {deletingSession && (
        <DeleteSessionDialog
          session={deletingSession}
          open={deletingSession !== null}
          onOpenChange={(open) => !open && setDeletingSession(null)}
        />
      )}
    </div>
  );
}
```

Note: `stopSession` from `useStopSession()` at the top of the component is unused directly (the dialog wires its own instance via `StopSessionForm`) — remove the unused `stopSession` variable if `pnpm lint` flags it as unused.

- [ ] **Step 6: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: no errors. If `stopSession` is flagged unused, delete the `const stopSession = useStopSession();` line (it's dead — `StopSessionForm` owns its own mutation instance).

- [ ] **Step 7: Manually verify in the browser**

Run: `pnpm dev`, log in as a test user, navigate to `/reading`. Confirm: page loads without console errors, "Start a session" dialog opens, stats/streak/timeline sections render (zero-state for a fresh user), session history shows the empty state.

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/reading/page.tsx components/shell/header.tsx components/shell/header.test.tsx
git commit -m "feat(reading): add reading dashboard page and header nav entry"
```

---

### Task 12: Full-repo verification gate

**Files:** none (verification only).

- [ ] **Step 1: Run the full gate**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

Expected: all green. Fix any failures by returning to the relevant task above — do not patch around a gate failure with an unrelated workaround.

- [ ] **Step 2: Re-verify the two previously-blocked endpoints against the live API**

With the API running locally and a bearer token from a test user (see the spec's "Live verification performed" section for the exact `curl` recipe):

```bash
curl -s -w "\n%{http_code}\n" http://localhost:8000/api/v1/me/reading/streak -H "Authorization: Bearer $TOKEN"
curl -s -w "\n%{http_code}\n" "http://localhost:8000/api/v1/me/reading/timeline?from_date=2026-06-01&to_date=2026-07-22" -H "Authorization: Bearer $TOKEN"
```

Expected: both return `200` (already confirmed during planning on 2026-07-22 — re-run once more right before merging to guard against a regression).

- [ ] **Step 3: Commit if any gate-fix changes were made**

If Step 1 required fixes, commit them with a message describing the specific fix (e.g. `fix(reading): satisfy eslint unused-var rule in reading page`).
