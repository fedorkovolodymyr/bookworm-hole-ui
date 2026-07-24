# Block 8 — API Audit Report

Cross-references every endpoint called from `lib/api/*.ts` (Blocks 1–7)
against the `bookworm-hole-api` route surface (`app/routers/*.py` on
`main`, read from source — no live server used). See
`docs/specs/2026-07-24-block-8-api-audit-design.md` for methodology.

## Summary

| Domain                                                     | Endpoints checked | Verified | Fixed inline | Filed as API bug | Dead code removed |
| ---------------------------------------------------------- | ----------------- | -------- | ------------ | ---------------- | ----------------- |
| Auth / Users                                               | 12                | 12       | 0            | 0                | 0                 |
| Books / Releases / Contributors / Contributions / External | 34                | 34       | 0            | 0                | 0                 |
| Collections / Reviews / Statuses / Share                   | 25                | 25       | 0            | 0                | 0                 |
| Reading                                                    | 9                 | 9        | 0            | 0                | 0                 |
| Friends                                                    | 10                | 10       | 0            | 0                | 0                 |
| AI / Chat                                                  | 8                 | 8        | 0            | 0                | 0                 |
| Admin                                                      | 13                | 13       | 0            | 0                | 0                 |
| **Total**                                                  | **111**           | **111**  | **0**        | **0**            | **0**             |

Every UI-called endpoint matches an existing API route on method, path,
request shape, and response shape. No broken endpoints, no schema drift,
no dead `lib/api/*.ts` functions (all have at least one hook/component
importer). No `report-api-bug` filings were needed.

## Per-domain detail

### Auth / Users (12/12)

`lib/api/auth.ts`, `lib/api/users.ts` vs `auth.py`, `users.py`.

All 5 `auth.ts` functions and 7 `users.ts` functions match their FastAPI
routes exactly, including the BFF proxy layer (`app/api/[...path]/route.ts`
forwards non-explicit paths 1:1 to FastAPI).

API routes not called by the UI (informational — not bugs):

- `GET /auth/me` — UI uses `GET /users/me` instead; functionally redundant
  on the API side.
- `GET /users/me/export/library.csv`, `POST /users/me/import/bookshelf`,
  `POST /users/me/import/csv`, `POST /users/me/import/goodreads`,
  `GET /users/me/export/all.json`, `POST /users/me/backup/google-drive`,
  `GET /users/me/backup/google-drive/history`,
  `POST /users/me/backup/google-drive/restore` — CSV import/export and
  Google Drive backup. No `lib/api/*.ts` wrapper exists anywhere in the
  repo; this is unbuilt future-scope functionality, not dead code.

### Books / Releases / Contributors / Contributions / External (34/34)

`lib/api/books.ts`, `books-admin.ts`, `releases.ts`, `releases-admin.ts`,
`contributors.ts`, `contributors-admin.ts`, `contributions.ts`,
`external.ts` vs `books.py`, `releases.py`, `contributors.py`,
`contributions.py`, `external.py`.

All 34 functions match. Enums (`ContributorRole`, `ReleaseFormat`,
`ISBNKind`, `ContributionKind`, `ContributionStatus`) verified 1:1 against
`app/models/catalog.py` / `app/models/contribution.py`.

**Informational note (not a contract bug):** `importBook`
(`lib/api/external.ts`) calls an admin-only endpoint
(`POST /external/import`, `require_admin`) but lives in `external.ts`
rather than a separate `external-admin.ts`, unlike the books/releases/
contributors domains which split public vs. admin functions into separate
files. Only 2 importers (`hooks/useImportBook.ts`,
`hooks/useExternalSearch.ts`); no functional or auth gap. Left as-is —
a pure naming-convention nit, not worth a churn-only rename.

### Collections / Reviews / Statuses / Share (25/25)

`lib/api/collections.ts`, `reviews.ts`, `statuses.ts`, `share.ts` vs
`collections.py`, `reviews.py`, `statuses.py`, `status_views.py`,
`share.py`.

All 25 functions match. `StatusViewSort` (UI, `types.ts:442`) confirmed
identical to `BookStatusSort` (API,
`app/repositories/book_status_repository.py:15`) —
`"acquired_at" | "title"` on both sides.

### Reading (9/9)

`lib/api/reading.ts` vs `reading_sessions.py`, `reading_stats.py`. Full
1:1 coverage both directions — every API route is called, every UI
function is used. `PositionUnit` enum matches exactly.

### Friends (10/10)

`lib/api/friends.ts`, `friends-content.ts` vs `friends.py`. Full 1:1
coverage. `FriendshipStatus` enum and `Page<T>` shape verified exact.

### AI / Chat (8/8)

`lib/api/ai.ts`, `lib/api/chat.ts` vs `ai.py`, `chat.py`.

All 8 functions match. Two forward-looking observations, neither blocking
nor filed as bugs:

1. **`/ai/*` still unimplemented** — all three routes
   (`recommend`, `summary`, `tag-suggest`) unconditionally return `501`,
   unchanged since Block 6. Additionally, none of the three routes have
   any auth dependency at all (unlike every `/chat/*` route, which
   requires `get_current_user`) — worth flagging for whoever implements
   them for real, since an unauthenticated recommend-for-any-`user_id`
   endpoint is a likely oversight rather than a deliberate choice. Not
   filed as a bug since the UI isn't exposed to it (stub 501s regardless
   of auth).
2. **`/chat/ws` now exists** — a WebSocket endpoint
   (`chat.py`, dual auth via query-param token or first-message auth,
   broadcast on send, 30s heartbeat) has been added to the API since the
   Block 6 UI design was written. That design doc states polling is "the
   only option available against the current API surface" — now stale.
   Not a bug (current polling implementation, `hooks/useChat.ts`, 20s
   interval, still works correctly), but a good candidate for a future
   block/ticket to replace polling with real-time delivery.

### Admin (13/13)

`lib/api/admin-users.ts`, `admin-audit-logs.ts`, `admin-contributions.ts`,
`admin-catalog-imports.ts` vs `admin_users.py`, `admin_audit_logs.py`,
`admin_contributions.py`, `admin_catalog_imports.py`.

All 13 functions match, including enum sets (`AuditAction`,
`AuditTargetType`, `ContributionKind`, `ContributionStatus`,
`CatalogImportProfile`). All four routers apply `require_admin` at the
router level; UI's `middleware.ts` JWT-claim check is a UX gate only,
consistent with the documented pattern of deferring real enforcement to
the API.

## Conclusion

No API-side issues found — no `bookworm-hole-api` GitHub issues filed.
No UI-side code changes required. The `lib/api/`/`hooks/` layer built up
across Blocks 1–7 is in full, verified contract agreement with the
current `bookworm-hole-api` `main` branch.
