# Block 4 (Reading) — Design

## Purpose

Fourth domain block on top of Block 1's auth/session pattern. Covers the
`reading` API surface — all endpoints live under `/api/v1/me/reading/*`
(there is no separate top-level `reading_sessions`/`reading_stats` router
as the original delivery-blocks table guessed; it's one small,
self-contained "my reading" domain under the `me` router). Covers starting
and stopping a reading session, listing/editing/deleting past sessions,
and a stats/streak/timeline dashboard.

## API Blocker (RESOLVED)

`GET /me/reading/streak` and `GET /me/reading/timeline` previously 500'd
for every user — raw SQL bugs in
`app/repositories/reading_stats_repository.py`. Filed as
[fedorkovolodymyr/bookworm-hole-api#141](https://github.com/fedorkovolodymyr/bookworm-hole-api/issues/141),
now **closed**. Re-verified live on 2026-07-22 against a fresh test user:

- `GET /me/reading/streak` → 200 `{"current_streak_days":0,"longest_streak_days":0}`
- `GET /me/reading/timeline?from_date=2026-07-01&to_date=2026-07-22` → 200, `TimelineResponse` with one `TimelineEntry` per day, all-zero for a fresh user.
- `GET /me/reading/stats` → 200, all-zero, as before.

No remaining blocker — both hooks and components can wire directly to
the live endpoints; no mock-only gating needed.

## Real API surface (verified against running OpenAPI schema; live-tested where noted)

| Endpoint                                   | Method | Request                                                                                                                                                                    | Response                                                                                                                                                                                               |
| ------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/v1/me/reading/active`                | GET    | — (bearer)                                                                                                                                                                 | `ReadingSessionResponse[]` — sessions with `ended_at: null`. **Verified live: 200, `[]`.**                                                                                                             |
| `/api/v1/me/reading/sessions`              | GET    | Query `release_id?` (uuid, filter)                                                                                                                                         | `ReadingSessionResponse[]`. **Verified live: 200, `[]`.**                                                                                                                                              |
| `/api/v1/me/reading/sessions/{session_id}` | PATCH  | `UpdateReadingSessionSchema {started_at?, ended_at?, position_start?, position_end?, position_unit?, pages_read?, notes?}` (all optional, for correcting a logged session) | `ReadingSessionResponse`                                                                                                                                                                               |
| `/api/v1/me/reading/sessions/{session_id}` | DELETE | — (bearer)                                                                                                                                                                 | 204                                                                                                                                                                                                    |
| `/api/v1/me/reading/start`                 | POST   | `CreateReadingSessionSchema {release_id, position_start?, position_unit?}`                                                                                                 | 201 `ReadingSessionResponse`                                                                                                                                                                           |
| `/api/v1/me/reading/stop`                  | POST   | `StopReadingSessionSchema {release_id, position_end?, notes?}`                                                                                                             | 200 `ReadingSessionResponse` (sets `ended_at`, computes `pages_read`)                                                                                                                                  |
| `/api/v1/me/reading/stats`                 | GET    | Query `period?` (`Period` enum: `week`\|`month`\|`year`\|`all`, default `month`)                                                                                           | `ReadingStatsResponse {total_minutes, total_sessions, unique_books, total_pages}`. **Verified live: 200, `{"total_minutes":0,"total_sessions":0,"unique_books":0,"total_pages":0}` for a fresh user.** |
| `/api/v1/me/reading/streak`                | GET    | — (bearer)                                                                                                                                                                 | `StreakResponse {current_streak_days, longest_streak_days}`. **Verified live: 500 — see API Blocker.**                                                                                                 |
| `/api/v1/me/reading/timeline`              | GET    | Query `from_date`, `to_date` (both required, `date-time`)                                                                                                                  | `TimelineResponse {items: TimelineEntry[]}`, `TimelineEntry {date (YYYY-MM-DD string), total_minutes, sessions, pages_read}`. **Verified live: 500 — see API Blocker.**                                |

Notes on shapes:

- `ReadingSessionResponse` fields: `id, user_id, release_id, started_at,
ended_at, position_start, position_end, position_unit, pages_read,
notes, created_at, updated_at`. `position_unit` is a nullable enum
  `PositionUnit` (`page`\|`percent`\|`location`\|`timestamp`) — the app
  must pick the right unit per release's format (e.g. ebook percent vs.
  print page vs. audiobook timestamp).
- Sessions key off `release_id` (a specific edition/format), not
  `book_id` — matches the catalog domain's release-level granularity
  from Block 2. Starting a session requires a real `release_id`; there is
  no book-level "start reading this book, pick edition later" shortcut in
  the API.
- `start`/`stop` both take `release_id` in the body (not the session id)
  — `stop` doesn't take a session id at all; it's implicitly "stop my
  active session for this release." This means only one active session
  per release per user is meaningful, though `GET .../active` returns an
  array (multiple concurrent sessions across different releases are
  possible — e.g. reading two books at once).
- 422 `HTTPValidationError {detail: ValidationError[]}` (`{loc, msg,
type}`) on any bad query/body param, consistent with the rest of the
  API.

## Live verification performed

Registered a fresh test user (`POST /auth/register`), used the returned
`access_token` as a bearer token, then:

- `GET /me/reading/active` → 200, `[]`.
- `GET /me/reading/sessions` → 200, `[]`.
- `GET /me/reading/stats` (default `period=month`) → 200, all-zero
  `ReadingStatsResponse`, matches schema.
- `GET /me/reading/streak` → 200, all-zero `StreakResponse` (was 500,
  see API Blocker — since fixed and re-verified 2026-07-22).
- `GET /me/reading/timeline?from_date=...&to_date=...` → 200,
  `TimelineResponse` with a zero-value entry per day (was 500, same
  fix/re-verification).

Did not exercise `start`/`stop`/`PATCH`/`DELETE` live: as of 2026-07-22
the local DB has 2 books (`GET /books/` returns 2 items) but neither has
any releases (`GET /books/{id}` shows `"releases": []`), so there is
still no real `release_id` to start a session against. Their
request/response shapes above are taken directly from the OpenAPI
schema; implementation should re-verify these four once a release exists
(create one via the catalog/admin API if needed, or once shared
seed/fixture data exists).

## Architecture

- `lib/api/reading.ts` — typed client functions: `getActiveSessions()`,
  `getSessions(releaseId?)`, `startSession(body)`, `stopSession(body)`,
  `updateSession(sessionId, body)`, `deleteSession(sessionId)`,
  `getStats(period?)`, `getStreak()`, `getTimeline(fromDate, toDate)`.
  Uses the server-authenticated axios instance (bearer token from cookie,
  per Block 1's `lib/api/server-client.ts` pattern) for Server
  Components/route handlers, and the BFF-proxied client instance for
  client-side mutations (start/stop/update/delete).
- `hooks/useReading.ts` — TanStack Query:
  - `useActiveSessions()` — query, short `staleTime` (session is a live
    "currently reading" state; consider polling or refetch-on-focus).
  - `useSessions(releaseId?)` — query, session history list.
  - `useStartSession()` / `useStopSession()` — mutations, invalidate
    `["reading", "active"]` and `["reading", "sessions"]` on success.
  - `useUpdateSession()` / `useDeleteSession()` — mutations, invalidate
    `["reading", "sessions"]`.
  - `useReadingStats(period)` — query, keyed by period.
  - `useReadingStreak()` — query, wired directly to the live endpoint.
  - `useReadingTimeline(fromDate, toDate)` — query, wired directly to the
    live endpoint.
- `components/reading/` — presentational components (Storybook-covered):
  `ActiveSessionCard` (shows in-progress session + a "Stop" button),
  `StartSessionForm` (release picker + optional starting position),
  `SessionHistoryList` / `SessionHistoryItem` (with inline edit/delete),
  `ReadingStatsSummary` (stat tiles: total minutes, sessions, unique
  books, pages — from `ReadingStatsResponse`), `ReadingStreakBadge`
  (current/longest streak), `ReadingTimelineChart` (see Charts below).
- `app/(app)/reading/page.tsx` — main reading dashboard: active session(s)
  at top, "Start a session" entry point, stats summary, streak, timeline
  chart, and session history below (paginated via Block 0's `Pagination`
  component).

## UI Surface

- **Start/stop a session:** from a book/release detail page (Block 2) or
  the reading dashboard, "Start reading" opens `StartSessionForm`
  (release + optional starting position/unit). Once active, an
  `ActiveSessionCard` shows elapsed time client-side (computed from
  `started_at`, no live "timer" endpoint) with a "Stop" button opening a
  small form for ending position + optional notes, calling `stopSession`.
- **Session history:** `app/(app)/reading/page.tsx` lists past sessions
  (`SessionHistoryList`), each showing release, duration (`ended_at -
started_at`), pages read, notes. Each item has an edit action (opens a
  form pre-filled from `UpdateReadingSessionSchema` fields — useful for
  correcting a forgotten stop time or position) and a delete action
  (confirm `Dialog`, Block 0's kit).
- **Stats dashboard:** `ReadingStatsSummary` stat tiles for the selected
  `period` (week/month/year/all — `Tabs` or `Select` control from Block
  0's kit), a `ReadingStreakBadge`, and a chart section:
  - **Reading streak / activity**: a calendar heatmap (GitHub-contributions
    style) over the `timeline` endpoint's daily `TimelineEntry[]` —
    encodes `total_minutes` (or `sessions`) per day as heatmap intensity.
  - **Sessions-over-time**: a line/bar chart of `total_minutes` (or
    `pages_read`) per day from the same `TimelineResponse`, for the
    selected date range.
  - No repo-specific chart/dataviz convention doc exists yet in this repo
    (checked — no `dataviz` skill file or chart guidance under
    `docs/`/`components/`); follow the general `dataviz` skill's
    form/color guidance when implementing (categorical/sequential palette
    validator, accessible contrast, consistent light/dark handling) rather
    than inventing one-off styling. Do not over-design beyond these two
    chart types for this block.
  - Both charts are wired to `useReadingTimeline` against the live
    endpoint; Storybook stories still cover them against mocked
    `TimelineEntry[]` fixtures for isolated visual review/regression.
- Reading nav entry (Block 0's header already has a `Reading` placeholder
  link) now points at `/reading`.

## Data Flow & Error Handling

- Loading via Query `isPending`/`isFetching` + `Skeleton` (Block 0 kit) —
  stat tiles and chart show skeleton placeholders while loading.
- 422 (bad `period`/date query params) surfaces as an inline form/filter
  error near the control that produced it (period selector, date range
  picker), not a global toast.
- Any 500 (e.g. a regression on `streak`/`timeline`) must **not** be
  silently swallowed into an empty/zero state that looks like real data — render
  an explicit "Unable to load this data right now" inline error state
  distinct from the true "no sessions yet" empty state (which returns a
  clean 200 with zero values, per live-tested `stats` behavior). Reusing
  the same zero-state UI for both would mask the API bug from users and
  from the Block 8 audit.
- Starting a session while one is already active for that release:
  API shape doesn't define a conflict response explicitly in the schema
  (no documented 409); treat any non-2xx as a generic form-level error
  until real behavior is observed (no release data available locally to
  test this branch — flag for re-verification once Block 2 seed data
  exists).
- `useActiveSessions()` refetch-on-window-focus enabled (default TanStack
  Query behavior) so a session started in another tab/device shows up
  without a manual refresh.

## Testing Strategy

- Vitest + RTL: `StartSessionForm`, `ActiveSessionCard` (stop flow),
  `SessionHistoryItem` (edit/delete), `ReadingStatsSummary`,
  `ReadingStreakBadge`, `ReadingTimelineChart` — render, empty state vs.
  populated state, error state. Mock API with `msw`, including a mocked
  500 branch for timeline/streak to cover the distinct error state.
- Hook tests: `useReading.ts` hooks against mocked API success + error
  (422, 500) branches, including the distinct "empty" vs "error" cases
  called out above.
- Playwright: happy-path e2e — start a session → stop it → see it in
  history → see stats/streak/timeline reflect it. Requires a real
  `release_id`; if no release exists yet in the seed/fixture data at
  implementation time, create one via the catalog API first (or flag for
  follow-up once Block 2 seed data exists).

## Out of Scope (this block)

- Any book/release browsing or picking UI beyond a minimal release
  selector needed to start a session — full catalog browse/search is
  Block 2's responsibility; this block assumes a `release_id` is already
  known (passed in from a book detail page) or picked from a simple
  dropdown of the user's library.
- Reading goals/targets (e.g. "read 20 books this year") — no such
  endpoint exists in the current API surface; flagged for Block 8 API
  audit as a potential missing feature if product wants it later.
- Social/friend reading activity feed — that's `friends`/`status_views`
  territory (Blocks 3/5), not this block.
- Fixing the API bugs themselves — was tracked in
  fedorkovolodymyr/bookworm-hole-api#141, resolved on the API side prior
  to this block's implementation.
