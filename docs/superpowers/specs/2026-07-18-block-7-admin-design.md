# Block 7 (Admin) — Design

## Purpose

Admin-only dashboard covering the `admin_users`, `admin_audit_logs`, and
`admin_contributions` API routers: list/search users and toggle their
active/admin status, issue password resets, browse the audit log of admin
actions, and run the contribution moderation queue (claim, diff, approve,
reject) for user-submitted catalog edits. Gated end-to-end on the
authenticated user's `is_admin` flag (established in Block 1's
`UserResponse`/`UserProfileResponse` schemas) — non-admins never see the
`/admin` nav item and are redirected server-side if they hit an admin URL
directly.

Regular users propose catalog edits via the non-admin `contributions`
router (`POST /contributions`, `GET /contributions/me/contributions`,
`GET|PATCH|DELETE /contributions/{id}`, `POST /contributions/{id}/submit`)
— that submission-side UI belongs to Block 2 (Catalog), which already
references "submit an edit" as a gap/future item. This block only builds
the admin review side (`/admin/contributions/...`); the two share the same
underlying `Contribution` record (`ContributionResponse` for the submitter,
`AdminContributionResponse` for the reviewer — same fields, admin version
adds nothing extra besides route protection), so the moderation queue here
is effectively "what regular users submitted, now queued for review."

## Real API surface (verified against running OpenAPI schema)

### Users

| Endpoint                                       | Method | Request                                                                                                                          | Response                                                                     |
| ---------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/api/v1/admin/users/`                         | GET    | Query params: `skip` (int, default 0), `limit` (int, default 10), `email?`, `username?`, `is_active?` (bool), `is_admin?` (bool) | `Page_AdminUserResponse_ {items: AdminUserResponse[], total, limit, offset}` |
| `/api/v1/admin/users/{user_id}/activate`       | POST   | — (path: `user_id` uuid)                                                                                                         | `AdminUserResponse`                                                          |
| `/api/v1/admin/users/{user_id}/deactivate`     | POST   | — (path: `user_id` uuid)                                                                                                         | `AdminUserResponse`                                                          |
| `/api/v1/admin/users/{user_id}/promote`        | POST   | — (path: `user_id` uuid)                                                                                                         | `AdminUserResponse`                                                          |
| `/api/v1/admin/users/{user_id}/demote`         | POST   | — (path: `user_id` uuid)                                                                                                         | `AdminUserResponse`                                                          |
| `/api/v1/admin/users/{user_id}/password-reset` | POST   | — (path: `user_id` uuid)                                                                                                         | `PasswordResetTokenResponse {reset_token}`                                   |

`AdminUserResponse {id, email, username, display_name, is_active, is_admin}`
— narrower than Block 1's `UserResponse`/`UserProfileResponse` (no
`email_verified_at`, `bio`, `avatar_url`, etc. — admin list view only needs
identity + status fields).

All five action endpoints (`activate`/`deactivate`/`promote`/`demote`/
`password-reset`) return `401`/`403`/`404`/`422` — `403` is the
non-admin-caller case, `404` is unknown `user_id`.

`password-reset` returns a raw `reset_token` string directly in the JSON
body (not emailed) — the UI must render this token to the admin (e.g. in a
copyable code block inside a confirmation dialog) since there is no other
channel to retrieve it; flagged in Data Flow below as a UX/security
consideration.

### Audit Logs

| Endpoint                    | Method | Request                                                                                                                                                                                                           | Response                                                                   |
| --------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `/api/v1/admin/audit-logs/` | GET    | Query params: `skip` (int, default 0), `limit` (int, default 10), `actor_id?` (uuid), `action?` (`AuditAction` enum), `target_type?` (`AuditTargetType` enum), `start_date?` (date-time), `end_date?` (date-time) | `Page_AuditLogResponse_ {items: AuditLogResponse[], total, limit, offset}` |

`AuditAction` enum: `approve_contribution`, `reject_contribution`,
`claim_contribution`, `activate_user`, `deactivate_user`, `promote_user`,
`demote_user` — every mutating admin action in this block is itself
audit-logged by the API, so the audit log viewer is the record of every
other action taken on this dashboard.

`AuditTargetType` enum: `contribution`, `user`.

`AuditLogResponse {id, actor_id, action, target_type, target_id,
audit_metadata (free-form object), ip_address (nullable), created_at}`.

### Contribution Moderation Queue

| Endpoint                                                | Method | Request                                                                                                                             | Response                                                                                     |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `/api/v1/admin/contributions/`                          | GET    | Query params: `status?` (`ContributionStatus` enum, default `submitted`), `skip` (int, default 0), `limit` (int, 1-100, default 10) | `Page_AdminContributionResponse_ {items: AdminContributionResponse[], total, limit, offset}` |
| `/api/v1/admin/contributions/{contribution_id}/claim`   | POST   | — (path: `contribution_id` uuid)                                                                                                    | `AdminContributionResponse`                                                                  |
| `/api/v1/admin/contributions/{contribution_id}/diff`    | GET    | — (path: `contribution_id` uuid)                                                                                                    | `ContributionDiffResponse {proposed: object, current: object \| null, warnings: string[]}`   |
| `/api/v1/admin/contributions/{contribution_id}/approve` | POST   | — (path: `contribution_id` uuid)                                                                                                    | `AdminContributionResponse`                                                                  |
| `/api/v1/admin/contributions/{contribution_id}/reject`  | POST   | `RejectContributionSchema {notes: string}` (required)                                                                               | `AdminContributionResponse`                                                                  |

`ContributionStatus` enum: `draft`, `submitted`, `under_review`, `approved`,
`rejected`, `merged`. The admin queue defaults to `submitted` — the
default landing view is "things waiting for a reviewer." `claim` presumably
transitions `submitted` → `under_review` and stamps `reviewer_id` (exact
transition semantics not spelled out in the schema, only inferable from
field names — the queue UI should refetch after `claim` rather than assume
the resulting status client-side).

`ContributionKind` enum: `new_book`, `new_release`, `new_contributor`,
`edit_book`, `edit_release`, `edit_contributor` — this determines how the
UI should render `payload`/`proposed`/`current` (a `new_*` kind has
`current: null`; an `edit_*` kind has both `proposed` and `current` for a
side-by-side diff).

`AdminContributionResponse {id, user_id, kind, target_id (nullable uuid —
null for `new_*` kinds), payload (free-form object), status, reviewer_id
(nullable), review_notes (nullable), created_at, updated_at, warnings
(string[], default [])}`. `warnings` likely surfaces validation concerns
about the proposed payload (e.g. possible duplicate) for the reviewer to
weigh — render as inline alert chips on the queue row/detail view.

`approve`/`reject`/`claim` all additionally return `409` (conflict — e.g.
already claimed by another admin, or not in a claimable/approvable state)
alongside `401`/`403`/`404`/`422`. The UI must surface `409` as a
non-fatal, refetch-and-retry-guided error ("This contribution was already
reviewed by someone else — refreshing the queue"), not a generic failure
toast, since it's an expected race in a multi-admin queue.

### Pairing with the non-admin `contributions` router (context only, not built here)

| Endpoint                                         | Method           | Notes                                                                                                                                    |
| ------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/contributions/`                         | POST             | Regular user proposes an edit — `CreateContributionSchema {kind, target_id?, payload}` → `ContributionResponse` (201). Owned by Block 2. |
| `/api/v1/contributions/me/contributions`         | GET              | User's own contribution history. Owned by Block 2.                                                                                       |
| `/api/v1/contributions/{contribution_id}`        | GET/PATCH/DELETE | View/edit/withdraw own draft. Owned by Block 2.                                                                                          |
| `/api/v1/contributions/{contribution_id}/submit` | POST             | Draft → `submitted`, making it appear in this block's moderation queue. Owned by Block 2.                                                |

`ContributionResponse` (submitter-facing) and `AdminContributionResponse`
(reviewer-facing) carry identical fields except the admin variant adds
`warnings`. No API blocker here — noted so the moderation queue's data
flow (where contributions come from) is legible without redesigning the
submission side.

## Admin Route Protection

Extends Block 1's middleware — does not reinvent auth:

- Block 1's `middleware.ts` already gates all `(app)` routes on a valid
  access-token cookie (redirecting to `/login` on missing/expired +
  failed-refresh). This block adds a second, narrower check layered on
  top: for any request path under `/admin` (i.e. `app/(app)/admin/**`),
  after the existing session check passes, decode/inspect the session's
  user record for `is_admin: true`.
- Two viable implementation shapes (pick one when planning; both build on
  Block 1's existing pieces, no new auth primitive):
  1. Middleware already has to validate the access token to check
     expiry — extend that path to also fetch/cache `is_admin` (e.g. via a
     lightweight `/auth/me` call or a claim embedded in the access token,
     whichever Block 1 actually implemented) and `NextResponse.redirect`
     to `/` (or a `/403` page) for non-admins hitting `/admin/**`.
  2. If Block 1's middleware only validates cookie presence/expiry (not
     full user fetch, to stay fast), do the `is_admin` check in
     `app/(app)/admin/layout.tsx` as a Server Component using
     `lib/api/server-client.ts` (Block 1) to call `GET /auth/me`/`GET
/users/me`, and `redirect("/")` from there if `!is_admin`. This is
     simpler to reason about (co-located with the admin routes) at the
     cost of one extra request per admin-route navigation — acceptable
     given this is a low-traffic internal surface.
- Either way: the check is server-side (middleware or Server Component),
  never client-side-only — a client-side `if (!isAdmin) redirect()` would
  flash protected content before redirecting and doesn't stop direct
  API misuse from the same session (though the API itself independently
  enforces `403` on every admin endpoint regardless of what the UI does,
  per the schema above — UI-side gating is a UX/defense-in-depth layer,
  not the actual security boundary).
- The header's nav (Block 0/1's `components/layout/header.tsx`) gains a
  conditional "Admin" link, shown only when `useMe()` reports
  `is_admin: true`.

## Architecture

- `lib/api/admin.ts` — typed client functions: `listUsers`, `activateUser`,
  `deactivateUser`, `promoteUser`, `demoteUser`, `resetUserPassword`,
  `listAuditLogs`, `listContributions`, `claimContribution`,
  `getContributionDiff`, `approveContribution`, `rejectContribution`. All
  admin calls go through `lib/api/server-client.ts` (Block 1's
  bearer-token server-only axios instance) since these are Server
  Component/Route Handler-driven pages, not client-only BFF proxying —
  consistent with how Block 1 already calls `users/me` server-side.
- `hooks/useAdminUsers.ts` — `useAdminUsers(filters)` query,
  `useActivateUser`/`useDeactivateUser`/`usePromoteUser`/`useDemoteUser`/
  `useResetUserPassword` mutations (invalidate `["admin", "users"]` on
  success).
- `hooks/useAdminAuditLogs.ts` — `useAdminAuditLogs(filters)` query.
- `hooks/useAdminContributions.ts` — `useAdminContributions(status,
pagination)` query, `useContributionDiff(id)` query,
  `useClaimContribution`/`useApproveContribution`/`useRejectContribution`
  mutations (invalidate `["admin", "contributions"]` on success/409).
- `components/admin/` — `UserTable`, `UserRowActions` (activate/deactivate/
  promote/demote buttons + confirm dialogs), `PasswordResetDialog` (shows
  the returned `reset_token` once, with a copy button and a "this is
  shown only once" warning), `AuditLogTable`, `AuditLogFilters`,
  `ContributionQueueTable`, `ContributionDiffView` (renders `proposed` vs
  `current` per `ContributionKind` — key/value diff for `edit_*` kinds,
  plain payload render for `new_*` kinds since `current` is null),
  `ContributionReviewActions` (Claim / Approve / Reject-with-notes).
- `app/(app)/admin/layout.tsx` — admin section shell (sub-nav: Users /
  Audit Log / Contributions), server-side `is_admin` gate per above.
- `app/(app)/admin/users/page.tsx` — user table with filters
  (email/username/is_active/is_admin), pagination, row actions.
- `app/(app)/admin/audit-logs/page.tsx` — filterable/paginated audit log
  table.
- `app/(app)/admin/contributions/page.tsx` — moderation queue, status
  tabs/filter (defaulting to `submitted`), claim/approve/reject actions,
  diff view opened per-row (dialog or route to
  `admin/contributions/[id]`).

## UI Surface

- **Users tab**: paginated table (`id` hidden, `email`, `username`,
  `display_name`, `is_active` badge, `is_admin` badge), filter inputs
  (email, username, is_active, is_admin), per-row action menu:
  Activate/Deactivate (mutually exclusive by current `is_active`),
  Promote/Demote (mutually exclusive by current `is_admin`), Reset
  Password. Every destructive/state-changing action (deactivate, demote,
  password reset) goes through a confirm `Dialog` (Block 0 kit) —
  demote-self and deactivate-self are edge cases the API's `403`/business
  rules may or may not block; the UI defensively disables those actions
  when the row's `id` matches the current admin's own `id`, to avoid an
  admin locking themselves out via the UI (the API is the real guard, but
  the UI shouldn't invite the mistake).
- **Password reset flow**: click "Reset Password" → confirm dialog → on
  success, a second dialog shows the returned `reset_token` in a
  monospace, copy-to-clipboard field with a one-time-display warning
  ("this token will not be shown again — deliver it to the user out of
  band"). No further UI-side handling of the token (API doesn't expose an
  endpoint to consume it in this router — that's presumably part of the
  regular password-change/reset flow elsewhere, out of scope here).
- **Audit Log tab**: paginated, filterable table (`action` and
  `target_type` as `Select` dropdowns populated from the enums,
  `actor_id` as a text/uuid filter, `start_date`/`end_date` as a date
  range picker), columns: timestamp, actor, action (badge, color-coded by
  action family — user actions vs contribution actions), target
  type/id, `audit_metadata` shown as an expandable JSON viewer per row
  (free-form, no fixed shape to build a table around), `ip_address`.
- **Contributions tab (moderation queue)**: status filter tabs
  (`submitted` default, `under_review`, `approved`, `rejected`, `merged`,
  `draft` likely omitted from admin view — drafts aren't visible to
  reviewers per the submitter-only draft/edit lifecycle), paginated table
  (kind badge, submitter `user_id`, target/new indicator, created/updated
  timestamps, `warnings` count badge if non-empty), row click opens a
  detail view showing:
  - `ContributionDiffView`: calls the `/diff` endpoint, renders
    `proposed` vs `current` (null-safe — `new_*` kinds render `proposed`
    only as a "new record" card; `edit_*` kinds render a two-column or
    inline diff of changed keys).
  - `warnings` from either the list or diff response as alert callouts.
  - Actions: **Claim** (if `submitted`/unclaimed by this admin — assigns
    `reviewer_id`), **Approve** (enabled once claimed by the current
    admin — exact claim-gating enforced by the API's `409`, UI disables
    optimistically based on `reviewer_id === currentAdminId` but always
    defers to the API's actual response), **Reject** (opens a form
    requiring `notes`, since `RejectContributionSchema.notes` is
    required — submit disabled until non-empty).

## Data Flow & Error Handling

- Standard TanStack Query + `lib/api/server-client.ts` pattern from Block
  1 — no new auth pattern introduced.
- `403` from any admin endpoint (a non-admin session that got past
  middleware some other way, or a stale cached session) surfaces as a
  full-page "You don't have access to this page" state rather than an
  inline error, and should redirect to `/` after a short delay — this is
  a should-never-happen state given server-side gating, so it's treated
  as unexpected rather than a normal form-validation error.
- `404` on user/contribution actions (row acted on by another admin
  session, or stale client cache) → inline row-level error + refetch the
  list.
- `409` on contribution actions (claim/approve/reject races) → toast:
  "Someone else already reviewed this" + invalidate the contributions
  query to refetch current state, per Architecture section above.
- `422` (`HTTPValidationError`) on filter/query param misuse → should be
  rare since filters are enum-constrained `Select`s and typed inputs
  client-side, but if hit, surface as a form-level alert on the filter
  bar, not a crash.
- Loading via Query's `isPending`/`isFetching` + `Skeleton` (table-row
  skeletons) from Block 0's kit; pagination controls via Block 0's
  `Pagination` component driven by `Page_*` response's `total`/`limit`/
  `offset`.

## Testing Strategy

- Vitest + RTL: `UserTable`/`UserRowActions` (render, confirm-dialog
  gating, self-action disabling, mutation calls), `PasswordResetDialog`
  (token display, copy button, one-time-warning), `AuditLogTable`/
  `AuditLogFilters` (enum filter rendering, metadata JSON viewer expand/
  collapse), `ContributionQueueTable`, `ContributionDiffView` (null-safe
  rendering for `new_*` vs `edit_*` kinds), `ContributionReviewActions`
  (claim/approve enabled-state logic, reject-notes-required validation).
  Mock the API with `msw` for success + `401`/`403`/`404`/`409`/`422`
  branches per hook.
- Hook tests: each `useAdmin*` query/mutation against mocked API
  responses, including the `409` race branch for contribution actions.
- Middleware/route-protection test: extend Block 1's middleware test
  suite with cases for `/admin/**` paths — admin session passes through,
  non-admin session redirected, missing session redirected to `/login`
  (existing Block 1 behavior, unchanged).
- Playwright: one happy-path e2e — log in as a seeded admin (requires a
  seeded admin fixture the Block 7 implementation plan must add, since
  none exists in the current dev seed data — see below), navigate to
  `/admin/contributions`, claim a `submitted` contribution, view its
  diff, approve it, confirm it disappears from the `submitted` filter and
  the action appears in the audit log. This e2e is blocked on an admin
  test fixture existing (either a seed script update in
  `bookworm-hole-api`, or a test-only DB flip of `is_admin` for a
  throwaway user) — flagged as a prerequisite for the Block 7
  implementation plan, not something this spec resolves.

## Out of Scope (this block)

- The regular-user contribution submission UI (`POST /contributions`,
  edit/withdraw own draft, submit for review) — owned by Block 2
  (Catalog), referenced here only for context on where the moderation
  queue's items come from.
- Any UI for consuming the `reset_token` returned by `password-reset`
  (e.g. an admin-initiated "set new password" flow) — no such endpoint
  exists in the current API surface; the token is handed to the admin to
  deliver out-of-band. Flagged for Block 8 API audit as a possible gap if
  product wants a full in-app reset flow.
- Bulk actions (bulk-approve, bulk-deactivate) — not in the API surface
  (all admin action endpoints are single-resource), not built here.
- Real-time/live-updating queue (e.g. websocket push when another admin
  claims something) — out of scope; the `409`-and-refetch pattern above
  is the only race-handling mechanism.
- A seeded admin user/fixture in `bookworm-hole-api` — does not currently
  exist (verified: `scripts/seed_data.py`'s `DEV_USERS` has exactly one
  non-admin dev user, no `is_admin` field set on seed rows). Creating one
  is a prerequisite for both Playwright e2e coverage and manual QA of this
  block, and belongs to the implementation plan / a small API-side seed
  change, not this design spec.

## Live Testing Note

Admin-gated endpoints (all of `admin_users`, `admin_audit_logs`,
`admin_contributions`) were **not** live-tested against the running API —
no admin credentials exist in the current seed data
(`scripts/seed_data.py`'s `DEV_USERS` seeds a single non-admin user,
`dev@bookwormhole.test`, and no script sets `is_admin: true` on any row),
and creating one requires direct DB access outside this task's scope.

What was verified live: `GET /api/v1/admin/users/` unauthenticated
correctly returns `401 {"detail": "Not authenticated"}`, consistent with
the OpenAPI schema — no bug found. All other endpoint shapes in this spec
are taken directly from the running API's OpenAPI schema (dumped fresh),
which has been reliable and internally consistent for every other
resource checked in this pass (no `$ref` resolution errors, no
undocumented fields). No API blocker filed for this block.
