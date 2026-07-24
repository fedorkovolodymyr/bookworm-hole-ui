# Block 7 (Admin) — Design

## Purpose

Covers the `admin` router: user management, audit log viewing, contribution
moderation, and catalog import jobs. All endpoints require an authenticated
admin user (`is_admin: true`); the API enforces this with `403` responses.
This block adds the UI surface for that workflow: a `/admin` section gated
so only admins can reach it, built on Block 1's cookie-auth pattern and
Block 3's contribution/catalog conventions.

`catalog-imports`, though tagged `admin` in the API rather than named as one
of the three routers in the original block table, is included here since
it's the same auth boundary and admin persona — see decision below.

## Real API surface (verified live against running API's `/openapi.json`)

All endpoints confirmed live via a running local API instance (registered a
throwaway user, inspected the OpenAPI schema and a real issued JWT).

| Endpoint                                             | Method | Request                                                  | Response                                                                |
| ----------------------------------------------------- | ------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/api/v1/admin/users/`                                 | GET    | query `skip?, limit?, email?, username?, is_active?, is_admin?` | `Page<AdminUserResponse>`                                                       |
| `/api/v1/admin/users/{user_id}/activate`               | POST   | —                                                                 | `AdminUserResponse`                                                             |
| `/api/v1/admin/users/{user_id}/deactivate`             | POST   | —                                                                 | `AdminUserResponse`                                                             |
| `/api/v1/admin/users/{user_id}/promote`                | POST   | —                                                                 | `AdminUserResponse`                                                             |
| `/api/v1/admin/users/{user_id}/demote`                 | POST   | —                                                                 | `AdminUserResponse`                                                             |
| `/api/v1/admin/users/{user_id}/password-reset`         | POST   | —                                                                 | `PasswordResetTokenResponse {reset_token}`                                      |
| `/api/v1/admin/audit-logs/`                            | GET    | query `skip?, limit?, actor_id?, action?, target_type?, start_date?, end_date?` | `Page<AuditLogResponse>`                                    |
| `/api/v1/admin/contributions/`                         | GET    | query `status? (default "submitted"), skip?, limit?`             | `Page<AdminContributionResponse>`                                               |
| `/api/v1/admin/contributions/{contribution_id}/claim`  | POST   | —                                                                 | `AdminContributionResponse`, `409` if already claimed                          |
| `/api/v1/admin/contributions/{contribution_id}/diff`   | GET    | —                                                                 | `ContributionDiffResponse {proposed, current, warnings}`                       |
| `/api/v1/admin/contributions/{contribution_id}/approve`| POST   | —                                                                 | `AdminContributionResponse`, `409` on invalid state transition                 |
| `/api/v1/admin/contributions/{contribution_id}/reject` | POST   | `RejectContributionSchema {notes: string}`                       | `AdminContributionResponse`, `409` on invalid state transition                 |
| `/api/v1/admin/catalog-imports`                        | POST   | `CatalogImportRequest {profile: "books"\|"comics"\|"manga"}`      | `CatalogImportJobStatusResponse {job_id, status, result?}`                     |
| `/api/v1/admin/catalog-imports/{job_id}`               | GET    | —                                                                 | `CatalogImportJobStatusResponse`                                                |

All list/mutation endpoints: `401` if unauthenticated, `403` if authenticated
but not admin.

### Response shapes

```ts
AdminUserResponse: { id, email, username, display_name, is_active, is_admin }

AuditLogResponse: {
  id, actor_id, action: AuditAction, target_type: AuditTargetType,
  target_id, audit_metadata: Record<string, unknown>, ip_address: string | null,
  created_at
}
AuditAction: "approve_contribution" | "reject_contribution" | "claim_contribution"
  | "activate_user" | "deactivate_user" | "promote_user" | "demote_user"
AuditTargetType: "contribution" | "user"

AdminContributionResponse: {
  id, user_id, kind: ContributionKind, target_id: string | null,
  payload: Record<string, unknown>, status: ContributionStatus,
  reviewer_id: string | null, review_notes: string | null,
  created_at, updated_at, warnings: string[]
}
ContributionDiffResponse: {
  proposed: Record<string, unknown>,
  current: Record<string, unknown> | null,
  warnings: string[]
}

PasswordResetTokenResponse: { reset_token: string }

CatalogImportRequest: { profile: "books" | "comics" | "manga" }
CatalogImportJobStatusResponse: { job_id, status: string, result?: Record<string, number> | null }
```

`Page<T>` reuses the existing generic already in `lib/api/types.ts`
(`{ items: T[], total, limit, offset }`) — same shape as
`Page_AdminUserResponse_`, `Page_AuditLogResponse_`,
`Page_AdminContributionResponse_` in the OpenAPI schema.

`ContributionKind` and `ContributionStatus` enums already exist in
`lib/api/types.ts` from Block 3's user-facing contributions client
(`lib/api/contributions.ts`) — reuse them, don't redefine.

## Decision: include catalog-imports in this block

`/admin/catalog-imports` is tagged `admin` in the live API and requires the
same `is_admin` gate as the other three routers, even though it's not one
of the three routers named in the original per-block table (which predates
inspecting the live API). Since it shares the exact same auth boundary and
admin persona as the rest of this block, it's included here as a fourth
admin surface rather than deferred to a separate block.

## Admin access gating

No middleware exists yet in this repo (`middleware.ts` is a new file). The
`access_token` cookie is a JWT whose payload already carries an `is_admin`
claim (confirmed by decoding a real issued token:
`{"sub", "iat", "exp", "jti", "is_admin"}`), so the gate doesn't need an
extra network round-trip.

`middleware.ts`:
- `config.matcher: ["/admin/:path*"]`
- Reads `access_token` cookie. If absent, redirect to `/login`.
- Base64-decodes the JWT payload (no signature verification — this is a UX
  redirect only; the API is the real authority and returns `403` on any
  enforcement gap). If `is_admin !== true`, redirect to `/` .
- If decoding fails for any reason (malformed/expired-looking token),
  redirect to `/login` — fail closed.

This mirrors the "BFF cookie session, API enforces real authz" pattern
already used elsewhere: the UI gate is purely to avoid flashing admin UI
at non-admins, not a security boundary.

## Architecture (same shape as prior blocks)

```text
lib/api/
  admin-users.ts            # fetchAdminUsers, activateUser, deactivateUser,
                             # promoteUser, demoteUser, resetUserPassword
  admin-audit-logs.ts        # fetchAuditLogs
  admin-contributions.ts     # fetchAdminContributions, claimContribution,
                             # fetchContributionDiff, approveContribution,
                             # rejectContribution
  admin-catalog-imports.ts   # startCatalogImport, fetchCatalogImportStatus
  types.ts                   # + AdminUserResponse, AuditLogResponse, AuditAction,
                             # AuditTargetType, AdminContributionResponse,
                             # ContributionDiffResponse, RejectContributionPayload,
                             # PasswordResetTokenResponse, CatalogImportRequest,
                             # CatalogImportJobStatusResponse

hooks/
  useAdminUsers.ts           # useAdminUsers(filters), useActivateUser,
                             # useDeactivateUser, usePromoteUser, useDemoteUser,
                             # useResetUserPassword
  useAdminAuditLogs.ts        # useAdminAuditLogs(filters)
  useAdminContributions.ts    # useAdminContributions(status), useClaimContribution,
                             # useContributionDiff(id), useApproveContribution,
                             # useRejectContribution
  useAdminCatalogImports.ts   # useStartCatalogImport, useCatalogImportStatus(jobId)
                             # (polls while status is pending/running)

components/admin/
  user-table.tsx + .stories.tsx + .test.tsx
  user-row-actions.tsx + .stories.tsx + .test.tsx      # activate/deactivate/promote/demote menu
  password-reset-dialog.tsx + .stories.tsx + .test.tsx  # shows one-time reset_token, copy button
  audit-log-table.tsx + .stories.tsx + .test.tsx
  audit-log-filters.tsx + .stories.tsx + .test.tsx
  contribution-review-list.tsx + .stories.tsx + .test.tsx
  contribution-diff-viewer.tsx + .stories.tsx + .test.tsx  # reuse patterns from
                                                            # components/catalog/history/version-diff-viewer.tsx
  reject-contribution-dialog.tsx + .stories.tsx + .test.tsx  # requires notes
  catalog-import-form.tsx + .stories.tsx + .test.tsx
  catalog-import-status.tsx + .stories.tsx + .test.tsx

app/(app)/admin/
  layout.tsx                 # tab nav: Users / Audit Logs / Contributions / Catalog Imports
  users/page.tsx
  audit-logs/page.tsx
  contributions/page.tsx
  catalog-imports/page.tsx

middleware.ts                 # new — admin route gate (see above)
```

**Header nav:** add an "Admin" link in `components/shell/header.tsx`,
rendered only when `me?.is_admin` is true.

**i18n:** add `admin.*` namespace strings to existing locale files
(same files touched by every prior block).

## Data flow / error handling

No new patterns. Lists use `Page<T>` + existing pagination component
(`components/ui/pagination.tsx`). Mutations (activate/deactivate/promote/
demote/claim/approve/reject/reset-password) use TanStack Query mutations
that invalidate the relevant list query key on success. Errors surface
inline via TanStack Query's `error` state, consistent with every prior
block — no global error boundary changes.

`409` responses (invalid contribution state transition, e.g. approving an
already-approved contribution) render as an inline error message on the
review card rather than a toast, since it reflects a stale-list race
(another admin acted first) and the UI should prompt a refetch.

Catalog import status polling: `useCatalogImportStatus(jobId)` uses
`refetchInterval` that runs only while `status` is not a terminal value
(treat anything other than a recognized terminal string as still-running;
API returns `status` as a free-form string, not an enum, so poll until a
completed/failed/errored-looking terminal value is seen — stop polling
once `result` is non-null, which the API only populates on completion).

## Testing

- Unit/component tests + Storybook stories for every new component
  (existing convention, no exceptions).
- e2e happy-path test (Playwright): log in as an admin fixture user,
  promote/demote a user, claim → view diff → approve a contribution,
  trigger a catalog import and see status update. Mirrors the existing
  e2e pattern from Block 6 (`aa01b32`).
- Middleware itself gets a focused unit test asserting: no cookie → redirect
  to `/login`; non-admin JWT → redirect to `/`; admin JWT → next().

## Out of scope

- Backend changes of any kind (API is fully implemented and live-verified
  for this block already — no `report-api-bug` needed).
- Real cryptographic JWT verification in middleware (deferred; the API is
  the enforcement authority, this is UX-only).
- Bulk user actions (multi-select activate/deactivate) — not in the API.
