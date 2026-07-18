# Block 6 (AI & Chat) — Design

## Purpose

Covers the `ai` router (recommendations, text summary, tag suggestion) and
the `chat` router (direct-message threads between friends). Builds on
Block 1's BFF cookie-auth pattern and `lib/api/`/`hooks/` conventions, and
on Block 5's friend graph — chat threads can only be started between users
who are already friends. The `ai` endpoints are currently unimplemented
stubs on the API side ("Coming soon" in their OpenAPI descriptions, `501`
at runtime); this block builds the UI surface (forms + result displays)
against their documented request/response contract so the feature lights
up automatically once the backend implements it — no backend redesign is
in scope here.

## Real API surface (verified against running OpenAPI schema and live-tested against the running API)

All endpoints tested live with two freshly registered users
(`block6tester`, `block6tester2`) made friends via Block 5's friend-request
flow. Every response matched its documented OpenAPI schema exactly, with
correct status codes. No bugs found — no API Blocker section needed for
this block. See notes below the table for two live-tested behaviors worth
flagging to consumers of this spec (not bugs, but non-obvious).

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/v1/ai/recommend` | POST | `RecommendRequest {user_id, n?: int (1-100, default 10)}` | `RecommendResponse {book_ids: string[]}` — **live-tested: currently `501 {"detail": "AI recommendation feature is not implemented yet"}`, matches "Coming soon" OpenAPI description** |
| `/api/v1/ai/summary` | POST | `SummaryRequest {text}` | `SummaryResponse {summary}` — **live-tested: currently `501 {"detail": "AI summary feature is not implemented yet"}`** |
| `/api/v1/ai/tag-suggest` | POST | `TagSuggestRequest {book_id}` | `TagSuggestResponse {tags: string[]}` — **live-tested: currently `501 {"detail": "AI tag suggestion feature is not implemented yet"}`** |
| `/api/v1/chat/threads` | POST | `StartChatThreadSchema {recipient_id: uuid}` | `ChatThreadResponse {id, user_a_id, user_b_id, last_message_at, created_at}` — get-or-create; live-tested `401 {"detail": "You can only message your friends"}` when `recipient_id` is not a friend |
| `/api/v1/chat/threads/` | GET | — (bearer) | `ChatThreadWithLastMessageResponse[]` (adds `last_message: ChatMessageResponse \| null` to `ChatThreadResponse`'s fields) — list of all threads for the current user, live-tested returns `[]` then populated list after thread creation |
| `/api/v1/chat/threads/{thread_id}/messages` | GET | query `before?: uuid, limit?: int (1-100, default 50)` | `ChatMessageResponse[] {id, thread_id, sender_id, body, attachment_book_id, attachment_collection_id, read_at, created_at}` — cursor-paginated (`before` = message id cursor), `404` if thread doesn't exist/belong to user |
| `/api/v1/chat/threads/{thread_id}/messages` | POST | `SendChatMessageSchema {body, attachment_book_id?: uuid, attachment_collection_id?: uuid}` | `ChatMessageResponse` (same shape), `404` if thread not found |
| `/api/v1/chat/threads/{thread_id}/read` | POST | — (bearer) | `204`, `404` if thread not found |

### Live-tested notes (not bugs, but worth documenting for implementers)

- **`/chat/threads` vs `/chat/threads/` is not a routing bug.** These are
  two distinct, intentionally-registered paths: `POST /api/v1/chat/threads`
  (no trailing slash) is "start/get-or-create a thread", `GET
  /api/v1/chat/threads/` (trailing slash) is "list my threads". Confirmed
  live: `GET /api/v1/chat/threads` (no slash) returns `405 Method Not
  Allowed` (that path only has POST registered — FastAPI does not
  auto-redirect here since it's a different route object, not a
  redirect-slash mismatch), while `GET /api/v1/chat/threads/` (with slash)
  returns `200 []`. The UI's `lib/api/chat.ts` must call the exact path per
  verb (`POST /chat/threads`, `GET /chat/threads/`) — do not assume they're
  interchangeable or that one 404s.
- **`GET .../messages` appears to auto-mark returned messages as read.**
  Live test: after user1 sent a message, user2's `GET
  /chat/threads/{id}/messages` call returned the message with `read_at`
  already populated, before the explicit `POST .../read` call was made.
  The explicit `read` endpoint is still useful for marking a thread read
  without fetching messages (e.g. from a thread-list "mark all read"
  action), but the UI should not assume messages are unread just because
  `POST .../read` hasn't been called yet — always trust `read_at` on the
  message object itself for unread-badge logic, not "have I called read".
- **`ai/recommend`'s `RecommendRequest.user_id` and `TagSuggestRequest.book_id`
  are typed as bare `string` in the OpenAPI schema (no `format: uuid`)**,
  unlike every chat schema field. The UI should still pass real UUIDs (the
  current user's id, a book's id) but should not rely on client-side UUID
  validation matching the API's — treat these as opaque ID strings in the
  form layer.
- No Anthropic/Claude or other LLM provider is named anywhere in the `ai`
  router's OpenAPI descriptions or response shapes — the backend has not
  committed to an LLM vendor yet. This block only implements the UI
  contract (`RecommendRequest/Response`, `SummaryRequest/Response`,
  `TagSuggestRequest/Response`); whichever LLM the API team wires up later
  is opaque to the UI.

## Architecture

- `lib/api/ai.ts` — typed client functions: `recommendBooks(req)`,
  `generateSummary(req)`, `suggestTags(req)` — thin wrappers over the
  existing authenticated axios instance (`lib/api/client.ts` /
  `server-client.ts` from Block 1), each surfacing a `501` as a distinct,
  recognizable error (`AiFeatureUnavailableError`) so hooks/components can
  render a "coming soon" state rather than a generic failure toast.
- `lib/api/chat.ts` — typed client functions: `startThread(recipientId)`
  (`POST /chat/threads`), `listThreads()` (`GET /chat/threads/` — note
  trailing slash), `getThreadMessages(threadId, { before?, limit? })`,
  `sendMessage(threadId, body)`, `markThreadRead(threadId)`.
- `hooks/useAi.ts` — `useRecommendations()`, `useSummary()`,
  `useTagSuggestions()` mutations (these are on-demand actions, not cached
  queries, since results depend on point-in-time input text/book/user and
  the backend isn't stateful for them yet).
- `hooks/useChat.ts` — `useThreads()` query (`["chat", "threads"]`,
  moderate `staleTime` + manual refetch/polling — see Data Flow below),
  `useThreadMessages(threadId)` infinite query (cursor pagination via
  `before`), `useStartThread()`, `useSendMessage()` (optimistic append +
  invalidate `["chat", "threads"]` for last-message-preview refresh),
  `useMarkThreadRead()`.
- No WebSocket/SSE transport exists on the API for chat — real-time delivery
  is out of scope for this block (see Out of Scope). Polling is the only
  option available against the current API surface.

## UI Surface

- `app/(app)/ai/page.tsx` (or a set of smaller pages/panels, e.g.
  `app/(app)/ai/recommendations/page.tsx`) — three self-contained panels:
  - **Recommendations**: a "Get recommendations" button (uses current
    user's id automatically, optional `n` stepper) → result list of book
    ids rendered as `BookCard`s (Block 2's component, fetched by id) once
    `book_ids` come back; while the API 501s, render a disabled/"Coming
    soon" state instead of a form-level error toast.
  - **Summary**: a `Textarea` for input text + "Summarize" button → renders
    the returned `summary` in a `Card`; same "Coming soon" disabled
    treatment while 501.
  - **Tag suggestions**: a book picker (reuses Block 2's book search/select
    component) + "Suggest tags" button → renders returned `tags` as
    `Badge`s; same "Coming soon" treatment while 501.
- `app/(app)/chat/page.tsx` — thread list (left pane/list on mobile):
  each row shows the other participant (resolved from `user_a_id`/
  `user_b_id` vs current user's id — requires a lookup via Block 5's
  friend/user data, since `ChatThreadResponse` only carries raw ids, not
  display name/avatar), `last_message.body` preview truncated, relative
  timestamp from `last_message_at`, unread indicator (thread has any
  message with `read_at: null` not sent by the current user — the list
  endpoint doesn't expose an unread count directly, so this needs either a
  per-thread lookup or is deferred — see Data Flow).
- `app/(app)/chat/[threadId]/page.tsx` — message thread view: reverse-
  chronological message list with infinite scroll upward (cursor
  pagination via `before`), message bubble styled by `sender_id === me`,
  attachment chip when `attachment_book_id`/`attachment_collection_id` is
  set (renders a small `BookCard`/`CollectionCard` preview, resolved by id
  from Block 2/3's existing detail-fetch hooks), a `Textarea` + send button
  at the bottom, calls `markThreadRead` on mount/focus.
- `app/(app)/friends/[username]/page.tsx` (Block 5's existing friend
  profile page) gains a "Message" button that calls `startThread` with
  that friend's id and navigates to `chat/[threadId]`.
- Header (Block 0/1's `components/layout/header.tsx`) "Chat" nav link
  (already a placeholder since Block 0) gains a real unread-thread-count
  badge, sourced from `useThreads()`.

## Data Flow & Error Handling

- `useThreads()` polls on an interval (e.g. 15-30s via TanStack Query's
  `refetchInterval`) rather than true real-time, since no WebSocket/SSE
  exists on the API — documented as a known limitation, not silently
  degraded.
- `useThreadMessages(threadId)` uses `useInfiniteQuery` with `getNextPageParam`
  reading the oldest message's `id` as the next `before` cursor; also
  polls while the thread view is open, deduping against already-loaded
  message ids.
- `useSendMessage()` optimistically appends the outgoing message to the
  cached page before the request resolves (using a temporary client-side id
  swapped for the real `ChatMessageResponse.id` on success), rolls back on
  error, and invalidates `["chat", "threads"]` so the thread list's
  `last_message_at`/preview updates.
- `404` from `getThreadMessages`/`sendMessage`/`markThreadRead` (thread
  doesn't exist or doesn't belong to the user) redirects back to the
  thread list with an inline error banner — this can legitimately happen if
  a friend is unfriended mid-conversation (Block 5's unfriend flow doesn't
  delete existing threads/messages per the API's schema).
- `401` from `startThread` ("You can only message your friends") surfaces
  as a form-level alert on the friend-profile "Message" button flow — this
  is an expected business-rule rejection, not a session-auth failure, so it
  must not trigger the global 401→refresh-then-redirect-to-login
  interceptor from Block 1; `lib/api/chat.ts`'s `startThread` call should
  special-case this response body (checking the `detail` string, since the
  API doesn't return a distinct status/code for it) before it reaches the
  shared axios response interceptor, or the interceptor must be scoped to
  only the BFF auth routes rather than all API calls.
- `ai/*` mutations treat `501` as a distinct, recoverable UI state (render
  "Coming soon" / disable the result panel) rather than routing through the
  generic error-toast path used for 4xx/5xx elsewhere — this is the one
  domain in the app that intentionally has stub-only endpoints.
- `422` (`HTTPValidationError`) on any endpoint surfaces inline per-field
  under the relevant form input (input text length, missing recipient,
  etc.), consistent with Blocks 1/5.

## Testing Strategy

- Vitest + RTL: `ai` panels (recommendations/summary/tag-suggest forms) —
  render, submit calls the right mutation, renders "Coming soon" on `501`,
  renders results on a mocked `200`. Chat thread list and thread view
  components — render, unread indicator, optimistic send, infinite-scroll
  trigger, attachment chip rendering. Mock API with `msw`.
- Hook tests: `useThreads`, `useThreadMessages` (cursor pagination logic),
  `useSendMessage` (optimistic update + rollback), `useStartThread`
  (business-rule 401 handling distinct from session 401), each `ai` hook's
  501-vs-200 branches.
- Playwright: one happy-path e2e — two seeded friend accounts, log in as
  user A, open chat with friend B, send a message, log in as user B (or a
  second browser context), see the message, mark thread read — against the
  live API (per this spec's live test, this flow works end-to-end with no
  blockers). A second, shorter Playwright check on the `ai` panels
  asserting the "Coming soon" state renders correctly given the current
  `501` responses (not a full flow, since there's no success path to test
  yet).

## Out of Scope (this block)

- Real-time message delivery (WebSocket/SSE) — no such transport exists on
  the API; polling is the interim mechanism, flagged for Block 8's audit as
  a potential API gap if real-time is later desired.
- Actual AI/LLM behavior for recommend/summary/tag-suggest — these are
  `501` stubs on the API side; this block only builds the UI contract
  against the documented schema. Revisit once the API implements them (no
  UI changes should be needed beyond removing the "Coming soon" gating,
  assuming the response shapes don't change).
- Group chat / multi-party threads — the API's `ChatThreadResponse` is
  strictly two-party (`user_a_id`/`user_b_id`), no group model exists.
- Read receipts beyond the binary `read_at` timestamp (e.g. "delivered" vs
  "read" states, typing indicators) — not represented in the API schema.
- Unread-count aggregation at the API level — `GET /chat/threads/` doesn't
  return an unread count or flag per thread; if the per-thread unread
  lookup proves too expensive client-side, flag as a candidate additive
  field for Block 8's API audit.
