# Block 8 (API Audit) — Design

## Purpose

Cross-reference every endpoint the UI actually calls (`lib/api/*.ts`, all
prior blocks 1–7) against the full `bookworm-hole-api` route surface
(`app/routers/*.py` on `main`). Produce a table of endpoint usage and
status, fix trivial UI-side mismatches inline, and file
`bookworm-hole-api` issues (via the `report-api-bug` skill) for anything
that needs an API-side change.

## Source of truth

- **UI usage**: every function in `lib/api/*.ts` in this repo — grep the
  method + path each one calls.
- **API surface**: `app/routers/*.py` in the sibling `bookworm-hole-api`
  checkout at `/Users/fedvol/Documents/bookworm-hole/bookworm-hole-api`
  (root checkout, not one of its worktrees), read directly from source
  (route decorators + Pydantic request/response schemas). No live server
  needed.

## Domains and split

One subagent per API domain, each given its matching `lib/api/<domain>*.ts`
file(s) and the matching `app/routers/<domain>.py` file(s):

| Domain                             | UI file(s)                                                                                                                                      | API router(s)                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| auth/users                         | `auth.ts`, `users.ts`                                                                                                                           | `auth.py`, `users.py`                                                                         |
| books/releases/contributors        | `books.ts`, `books-admin.ts`, `releases.ts`, `releases-admin.ts`, `contributors.ts`, `contributors-admin.ts`, `contributions.ts`, `external.ts` | `books.py`, `releases.py`, `contributors.py`, `contributions.py`, `external.py`               |
| collections/reviews/statuses/share | `collections.ts`, `reviews.ts`, `statuses.ts`, `share.ts`                                                                                       | `collections.py`, `reviews.py`, `statuses.py`, `status_views.py`, `share.py`                  |
| reading                            | `reading.ts`                                                                                                                                    | `reading_sessions.py`, `reading_stats.py`                                                     |
| friends                            | `friends.ts`, `friends-content.ts`                                                                                                              | `friends.py`                                                                                  |
| ai/chat                            | `ai.ts`, `chat.ts`                                                                                                                              | `ai.py`, `chat.py`                                                                            |
| admin                              | `admin-users.ts`, `admin-audit-logs.ts`, `admin-contributions.ts`, `admin-catalog-imports.ts`                                                   | `admin_users.py`, `admin_audit_logs.py`, `admin_contributions.py`, `admin_catalog_imports.py` |

Each subagent reports, per endpoint it examined:

- `method | path | UI function | API route match? | shape match? | notes`
- Any endpoint the API exposes in that router but the UI never calls
  (informational — not necessarily dead, may be planned for a later block).
- Any UI function calling a path/method that doesn't exist in the router,
  or whose request/response shape in `lib/api/types.ts` diverges from the
  API's Pydantic schema.

## Fix-inline policy

- **Trivial UI-side bugs** (wrong path string, wrong HTTP method, stale
  param name, type mismatch that's clearly a UI typo) — fixed directly in
  this PR.
- **API-side gaps** (endpoint UI needs but API doesn't expose, API 500s,
  real schema drift where the API is wrong) — filed via `report-api-bug`
  skill against `bookworm-hole-api`, listed in the report as blocked/
  pending, not fixed here.
- Dead UI code (functions calling endpoints no page/hook uses) — noted,
  removed only if clearly orphaned (no importers).

## Deliverable

`docs/audits/2026-07-24-block-8-api-audit.md`: one table per domain as
above, plus a summary section (counts: verified / fixed / filed as API
bugs / dead code removed).

## Testing / verification

No new features, so no new component/hook tests. After inline fixes:
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`
must all pass (project's full gate).

## Out of scope

- Live-testing endpoints against a running API server (Block 6 did this
  live; here we're auditing source-level contract match, not runtime
  behavior).
- New features or new UI surface.
