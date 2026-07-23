# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git workflow

- **Never merge/push directly to `main`.** All work lands via PR (`gh pr create`), reviewed and merged through GitHub, even for docs-only or small changes. Work on a feature branch (e.g. `block-N-<name>`), open a PR, merge there.
- **No "🤖 Generated with Claude Code" footer or `Co-Authored-By: Claude` line in commit messages or PR descriptions.**

## Commands

```bash
pnpm install       # install deps
pnpm dev           # dev server on :3000
pnpm build         # production build
pnpm start         # run production build
pnpm lint          # eslint (flat config, eslint.config.mjs)
```

No test runner, typecheck script, or CI workflow exists yet — the Block 0 plan (see below) specifies `pnpm test`/`pnpm typecheck`/Storybook/GitHub Actions, but only the base Next.js scaffold has landed so far. Check `package.json` scripts before assuming a command exists.

## Architecture

This is `bookworm-hole-ui`, the standalone frontend for `bookworm-hole-api` (sibling repo), deployed on Vercel. It's built incrementally in large "blocks," each covering one API domain end-to-end. The full plan and rationale live in `docs/specs/2026-07-13-ui-repo-design.md` — read it before starting work on a new block.

**Current state:** Block 0 (Foundation) is in progress. Only the raw `create-next-app` scaffold exists (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`) — no design tokens, shadcn/ui components, Storybook, tests, or CI yet. Don't assume directories like `components/ui/`, `lib/api/`, or `hooks/` exist; check first.

**Target stack** (per the design spec, being introduced block by block):

| Concern            | Choice                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| Framework          | Next.js App Router, TypeScript                                                                    |
| Styling            | Tailwind CSS                                                                                      |
| Components         | shadcn/ui (Radix primitives), copied into `components/ui/` — not an npm dependency                |
| Data/cache         | TanStack Query + axios                                                                            |
| Auth               | Next.js middleware + httpOnly cookie via BFF route (token never touches `localStorage`/client JS) |
| Component workshop | Storybook (every base/domain component ships a story)                                             |
| Testing            | Vitest + React Testing Library (unit/component), Playwright (e2e happy paths)                     |
| Package manager    | pnpm                                                                                              |

**Target repo structure** (populated block by block, not all present yet):

```text
app/
  (auth)/               # login, register — Block 1
  (app)/                # authenticated shell: books, collections, reviews, reading, friends, chat, admin
components/
  ui/                   # shadcn/ui primitives
  <domain>/              # domain-specific composed components
lib/
  api/                  # axios client, per-domain API modules + types matching API schemas
  auth/                 # session helpers, middleware
hooks/                  # TanStack Query hooks per domain
tests/                  # Vitest setup; Playwright in e2e/
```

**Delivery blocks** (each = its own spec → plan → implementation cycle, building on the previous block's shell/API client):

| #   | Block                 | API routers                                                   | UI surface                                                                                                        |
| --- | --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 0   | Foundation            | —                                                             | Scaffold, CI, design tokens, base component kit, Storybook, app shell                                             |
| 1   | Auth & Session        | `auth`, `users`                                               | Login, register, logout, session refresh, profile, delete-account                                                 |
| 2   | Catalog               | `books`, `releases`, `contributors`, `external`               | Book search/browse/detail, external-source lookup                                                                 |
| 3   | Collections & Reviews | `collections`, `reviews`, `statuses`, `status_views`, `share` | Collections CRUD, reviews, status feed, share links                                                               |
| 4   | Reading               | `reading_sessions`, `reading_stats`                           | Reading sessions, stats dashboard                                                                                 |
| 5   | Social                | `friends`                                                     | Friends, requests, search                                                                                         |
| 6   | AI & Chat             | `ai`, `chat`                                                  | AI recommendations, chat interface                                                                                |
| 7   | Admin                 | `admin_users`, `admin_audit_logs`, `admin_contributions`      | Admin dashboard                                                                                                   |
| 8   | API Audit             | all                                                           | Cross-reference every endpoint the UI calls against the full API surface; report additions/changes/dead endpoints |

Each block after Block 0 follows the same shape: `lib/api/<domain>.ts` (typed client) → `hooks/use<Domain>.ts` (TanStack Query hooks) → `components/<domain>/` (Storybook-covered) → `app/(app)/<domain>/...` (pages) → tests → update Block 8's running endpoint-usage log.

**Error handling pattern:** axios instance with `withCredentials: true`; response interceptor attempts one silent refresh on 401, retries once, else redirects to login. Domain API errors surface through TanStack Query's `error` state and render as inline component states, not global crash boundaries (route-segment-level React error boundary is reserved for truly unexpected errors).

## Related repo

`bookworm-hole-api` is a sibling repo this UI consumes. If work here surfaces a bug or schema mismatch in the API (500s, OpenAPI drift, missing/wrong-shaped endpoint, CORS), use the `report-api-bug` skill — it files a GitHub issue against `bookworm-hole-api` and blocks the current PR until resolved.
