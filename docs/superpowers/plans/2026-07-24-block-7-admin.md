# Block 7 (Admin) Implementation Plan

> **For agentic workers:** this plan is executed via the
> `orchestrating-tiered-execution` skill (Haiku/Sonnet/Opus subagents,
> Sonnet orchestrating), not subagent-driven-development. Each task below
> is sized for a single subagent dispatch; the orchestrator reviews each
> diff against this plan before moving on, then runs the full gate
> (lint + test + build + format) after all tasks complete.

**Goal:** Ship the Block 7 Admin UI — user management, audit log viewer,
contribution moderation queue, and catalog import trigger — gated behind
an `is_admin` check, per `docs/specs/2026-07-24-block-7-admin-design.md`.

**Architecture:** Standard per-domain layering already used by every prior
block: `lib/api/admin-*.ts` (typed axios clients) → `hooks/useAdmin*.ts`
(TanStack Query) → `components/admin/*` (Storybook + Vitest covered) →
`app/(app)/admin/**/page.tsx`.

> **UPDATE (discovered mid-execution, see Task 10 below):** the admin
> gating this plan originally scoped as a new `middleware.ts` (Task 10)
> **already exists** on this branch as `proxy.ts` (Next.js renamed the
> middleware convention), added in prior commits `4980669`, `748c012`,
> `bc0339a`, `086c3d4`, `04f4d09` — before this plan was written. It
> already protects `/admin/:path*` with the same edge-JWT-decode approach
> this plan called for, PLUS a real server-side backstop
> (`app/(app)/admin/catalog/layout.tsx` calls `GET /users/me` with the
> live token and redirects non-admins). Task 10 is **struck** — do not
> create `middleware.ts`. Task 21 (the new `app/(app)/admin/layout.tsx`)
> is revised to reuse that same real server-side check pattern instead of
> being a client-only tab nav, so `/admin/users`, `/admin/audit-logs`,
> `/admin/contributions`, `/admin/catalog-imports` get the identical real
> backstop `/admin/catalog/*` already has.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, axios,
next-intl, Vitest + React Testing Library, Storybook, Playwright.

## Global Constraints

- All new API client functions live under `/admin/...` paths exactly as
  documented in the spec table — do not guess trailing slashes; use the
  exact path per endpoint (`/admin/users/`, `/admin/audit-logs/`,
  `/admin/contributions/` all have trailing slashes on the list GET;
  mutation/detail paths do not).
- Reuse the existing `Page<T>` generic from `lib/api/types.ts` — do not
  redefine pagination shape.
- Reuse existing `ContributionKind` and `ContributionStatus` enums already
  in `lib/api/types.ts` (from Block 3) — do not redefine.
- Every component gets a `.stories.tsx` and a `.test.tsx`, matching every
  existing `components/<domain>/` file — no exceptions.
- i18n: add strings under a new `admin` top-level key in both
  `messages/en.json` and `messages/uk.json` — every block so far has
  touched both locale files together.
- Follow the existing simple-pagination convention (`limit`-only fetch,
  local `skip`/`offset` state with plain prev/next buttons) as seen in
  `app/(app)/contributions/page.tsx` — do not introduce the shadcn
  `components/ui/pagination.tsx` link-based component; it isn't used
  anywhere yet and isn't the right shape for offset-based state.
- Mutation hooks invalidate the relevant list query key on success,
  matching `hooks/useContributions.ts`'s pattern exactly.
- `RejectContributionSchema` (API's OpenAPI schema name) becomes
  `RejectContributionPayload` in `lib/api/types.ts`, matching this repo's
  `*Payload` naming convention for request bodies (see
  `ChangePasswordPayload`, `UpdateProfilePayload`).

---

## File Structure

```text
lib/api/
  types.ts                    # MODIFY — add admin types (Task 1)
  admin-users.ts               # CREATE (Task 2)
  admin-audit-logs.ts           # CREATE (Task 3)
  admin-contributions.ts        # CREATE (Task 4)
  admin-catalog-imports.ts      # CREATE (Task 5)

hooks/
  useAdminUsers.ts              # CREATE (Task 6)
  useAdminAuditLogs.ts           # CREATE (Task 7)
  useAdminContributions.ts       # CREATE (Task 8)
  useAdminCatalogImports.ts      # CREATE (Task 9)

(Task 10 struck — `proxy.ts` already gates `/admin/:path*`, added before
this plan; see the note above Task 10 below.)

messages/en.json, messages/uk.json   # MODIFY — admin.* strings (Task 11)

components/admin/
  user-table.tsx + stories + test              # Task 12
  password-reset-dialog.tsx + stories + test    # Task 13
  audit-log-table.tsx + stories + test          # Task 14
  audit-log-filters.tsx + stories + test        # Task 15
  contribution-review-list.tsx + stories + test # Task 16
  contribution-diff-viewer.tsx + stories + test # Task 17
  reject-contribution-dialog.tsx + stories + test # Task 18
  catalog-import-form.tsx + stories + test      # Task 19
  catalog-import-status.tsx + stories + test    # Task 20
  admin-nav.tsx + stories + test                # Task 21 (part of revised layout task)

app/(app)/admin/
  layout.tsx                    # Task 21 (revised — real is_admin server check + tab nav)
  users/page.tsx                 # Task 22
  audit-logs/page.tsx             # Task 23
  contributions/page.tsx           # Task 24
  catalog-imports/page.tsx          # Task 25

components/shell/header.tsx        # MODIFY — admin nav link (Task 26)

e2e/admin.spec.ts                   # CREATE (Task 27)
```

---

### Task 1: Admin types in `lib/api/types.ts`

**Files:**
- Modify: `lib/api/types.ts` (append near end of file)

**Interfaces:**
- Consumes: existing `Page<T>` generic (already defined at line 82),
  existing `ContributionStatus`, `ContributionKind` (already defined from
  Block 3 — grep the file for `ContributionKind` before writing this task
  if the exact literal union isn't obvious from this plan; it's already
  present, do not redefine it).
- Produces (used by Tasks 2-9, 12-25):
  ```ts
  AdminUserResponse
  AuditAction
  AuditTargetType
  AuditLogResponse
  AdminContributionResponse
  ContributionDiffResponse
  RejectContributionPayload
  PasswordResetTokenResponse
  CatalogImportProfile
  CatalogImportRequest
  CatalogImportJobStatusResponse
  AdminUserListParams
  AdminAuditLogListParams
  ```

- [ ] **Step 1: Append the following to `lib/api/types.ts`**

```ts
// --- Admin domain types ---

export interface AdminUserResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  is_active: boolean;
  is_admin: boolean;
}

export interface AdminUserListParams {
  skip?: number;
  limit?: number;
  email?: string;
  username?: string;
  is_active?: boolean;
  is_admin?: boolean;
}

export type AuditAction =
  | "approve_contribution"
  | "reject_contribution"
  | "claim_contribution"
  | "activate_user"
  | "deactivate_user"
  | "promote_user"
  | "demote_user";

export type AuditTargetType = "contribution" | "user";

export interface AuditLogResponse {
  id: string;
  actor_id: string;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id: string;
  audit_metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AdminAuditLogListParams {
  skip?: number;
  limit?: number;
  actor_id?: string;
  action?: AuditAction;
  target_type?: AuditTargetType;
  start_date?: string;
  end_date?: string;
}

export interface AdminContributionResponse {
  id: string;
  user_id: string;
  kind: ContributionKind;
  target_id: string | null;
  payload: Record<string, unknown>;
  status: ContributionStatus;
  reviewer_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  warnings: string[];
}

export interface ContributionDiffResponse {
  proposed: Record<string, unknown>;
  current: Record<string, unknown> | null;
  warnings: string[];
}

export interface RejectContributionPayload {
  notes: string;
}

export interface PasswordResetTokenResponse {
  reset_token: string;
}

export type CatalogImportProfile = "books" | "comics" | "manga";

export interface CatalogImportRequest {
  profile: CatalogImportProfile;
}

export interface CatalogImportJobStatusResponse {
  job_id: string;
  status: string;
  result?: Record<string, number> | null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors (pre-existing errors, if any, are unrelated —
confirm by checking the error list doesn't mention any symbol from this
step).

- [ ] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(admin): add admin domain types"
```

---

### Task 2: `lib/api/admin-users.ts`

**Files:**
- Create: `lib/api/admin-users.ts`
- Test: `lib/api/admin-users.test.ts`

**Interfaces:**
- Consumes: `apiClient` from `./client`; `AdminUserResponse`,
  `AdminUserListParams`, `Page`, `PasswordResetTokenResponse` from `./types`
  (Task 1).
- Produces: `fetchAdminUsers`, `activateUser`, `deactivateUser`,
  `promoteUser`, `demoteUser`, `resetUserPassword` — consumed by Task 6.

- [ ] **Step 1: Write the test file**

```ts
// lib/api/admin-users.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import {
  fetchAdminUsers,
  activateUser,
  deactivateUser,
  promoteUser,
  demoteUser,
  resetUserPassword,
} from "./admin-users";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe("admin-users API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("fetches paginated admin users with params", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    const result = await fetchAdminUsers({ limit: 10, email: "a@b.com" });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/users/", {
      params: { limit: 10, email: "a@b.com" },
    });
    expect(result).toEqual(page);
  });

  it("activates a user", async () => {
    const user = { id: "u1", is_active: true };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await activateUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/activate");
    expect(result).toEqual(user);
  });

  it("deactivates a user", async () => {
    const user = { id: "u1", is_active: false };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await deactivateUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/deactivate");
    expect(result).toEqual(user);
  });

  it("promotes a user", async () => {
    const user = { id: "u1", is_admin: true };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await promoteUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/promote");
    expect(result).toEqual(user);
  });

  it("demotes a user", async () => {
    const user = { id: "u1", is_admin: false };
    vi.mocked(apiClient.post).mockResolvedValue({ data: user });

    const result = await demoteUser("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/demote");
    expect(result).toEqual(user);
  });

  it("resets a user's password and returns the reset token", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { reset_token: "tok123" } });

    const result = await resetUserPassword("u1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/users/u1/password-reset");
    expect(result).toEqual({ reset_token: "tok123" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/admin-users.test.ts`
Expected: FAIL — `Cannot find module './admin-users'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/api/admin-users.ts
import { apiClient } from "./client";
import type {
  AdminUserListParams,
  AdminUserResponse,
  Page,
  PasswordResetTokenResponse,
} from "./types";

export async function fetchAdminUsers(
  params: AdminUserListParams = {},
): Promise<Page<AdminUserResponse>> {
  const { data } = await apiClient.get("/admin/users/", { params });
  return data;
}

export async function activateUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/activate`);
  return data;
}

export async function deactivateUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/deactivate`);
  return data;
}

export async function promoteUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/promote`);
  return data;
}

export async function demoteUser(userId: string): Promise<AdminUserResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/demote`);
  return data;
}

export async function resetUserPassword(
  userId: string,
): Promise<PasswordResetTokenResponse> {
  const { data } = await apiClient.post(`/admin/users/${userId}/password-reset`);
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/admin-users.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/api/admin-users.ts lib/api/admin-users.test.ts
git commit -m "feat(admin): add admin users API client"
```

---

### Task 3: `lib/api/admin-audit-logs.ts`

**Files:**
- Create: `lib/api/admin-audit-logs.ts`
- Test: `lib/api/admin-audit-logs.test.ts`

**Interfaces:**
- Consumes: `apiClient`; `AdminAuditLogListParams`, `AuditLogResponse`,
  `Page` from `./types` (Task 1).
- Produces: `fetchAuditLogs` — consumed by Task 7.

- [ ] **Step 1: Write the test file**

```ts
// lib/api/admin-audit-logs.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { fetchAuditLogs } from "./admin-audit-logs";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn() },
}));

describe("admin-audit-logs API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it("fetches paginated audit logs with filters", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    const result = await fetchAuditLogs({ limit: 10, action: "promote_user" });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs/", {
      params: { limit: 10, action: "promote_user" },
    });
    expect(result).toEqual(page);
  });

  it("fetches with no filters", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    await fetchAuditLogs();

    expect(apiClient.get).toHaveBeenCalledWith("/admin/audit-logs/", { params: {} });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/admin-audit-logs.test.ts`
Expected: FAIL — `Cannot find module './admin-audit-logs'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/api/admin-audit-logs.ts
import { apiClient } from "./client";
import type { AdminAuditLogListParams, AuditLogResponse, Page } from "./types";

export async function fetchAuditLogs(
  params: AdminAuditLogListParams = {},
): Promise<Page<AuditLogResponse>> {
  const { data } = await apiClient.get("/admin/audit-logs/", { params });
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/admin-audit-logs.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/api/admin-audit-logs.ts lib/api/admin-audit-logs.test.ts
git commit -m "feat(admin): add admin audit logs API client"
```

---

### Task 4: `lib/api/admin-contributions.ts`

**Files:**
- Create: `lib/api/admin-contributions.ts`
- Test: `lib/api/admin-contributions.test.ts`

**Interfaces:**
- Consumes: `apiClient`; `AdminContributionResponse`,
  `ContributionDiffResponse`, `ContributionStatus`, `RejectContributionPayload`,
  `Page` from `./types`.
- Produces: `fetchAdminContributions`, `claimContribution`,
  `fetchContributionDiff`, `approveContribution`, `rejectContribution` —
  consumed by Task 8.

- [ ] **Step 1: Write the test file**

```ts
// lib/api/admin-contributions.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import {
  fetchAdminContributions,
  claimContribution,
  fetchContributionDiff,
  approveContribution,
  rejectContribution,
} from "./admin-contributions";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe("admin-contributions API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("fetches paginated contributions by status", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(apiClient.get).mockResolvedValue({ data: page });

    const result = await fetchAdminContributions({ status: "submitted", limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith("/admin/contributions/", {
      params: { status: "submitted", limit: 10 },
    });
    expect(result).toEqual(page);
  });

  it("claims a contribution", async () => {
    const contribution = { id: "c1", status: "under_review" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: contribution });

    const result = await claimContribution("c1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/contributions/c1/claim");
    expect(result).toEqual(contribution);
  });

  it("fetches a contribution diff", async () => {
    const diff = { proposed: {}, current: null, warnings: [] };
    vi.mocked(apiClient.get).mockResolvedValue({ data: diff });

    const result = await fetchContributionDiff("c1");

    expect(apiClient.get).toHaveBeenCalledWith("/admin/contributions/c1/diff");
    expect(result).toEqual(diff);
  });

  it("approves a contribution", async () => {
    const contribution = { id: "c1", status: "approved" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: contribution });

    const result = await approveContribution("c1");

    expect(apiClient.post).toHaveBeenCalledWith("/admin/contributions/c1/approve");
    expect(result).toEqual(contribution);
  });

  it("rejects a contribution with notes", async () => {
    const contribution = { id: "c1", status: "rejected" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: contribution });

    const result = await rejectContribution("c1", { notes: "bad data" });

    expect(apiClient.post).toHaveBeenCalledWith("/admin/contributions/c1/reject", {
      notes: "bad data",
    });
    expect(result).toEqual(contribution);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/admin-contributions.test.ts`
Expected: FAIL — `Cannot find module './admin-contributions'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/api/admin-contributions.ts
import { apiClient } from "./client";
import type {
  AdminContributionResponse,
  ContributionDiffResponse,
  ContributionStatus,
  Page,
  RejectContributionPayload,
} from "./types";

export async function fetchAdminContributions(
  params: { status?: ContributionStatus; skip?: number; limit?: number } = {},
): Promise<Page<AdminContributionResponse>> {
  const { data } = await apiClient.get("/admin/contributions/", { params });
  return data;
}

export async function claimContribution(
  contributionId: string,
): Promise<AdminContributionResponse> {
  const { data } = await apiClient.post(`/admin/contributions/${contributionId}/claim`);
  return data;
}

export async function fetchContributionDiff(
  contributionId: string,
): Promise<ContributionDiffResponse> {
  const { data } = await apiClient.get(`/admin/contributions/${contributionId}/diff`);
  return data;
}

export async function approveContribution(
  contributionId: string,
): Promise<AdminContributionResponse> {
  const { data } = await apiClient.post(`/admin/contributions/${contributionId}/approve`);
  return data;
}

export async function rejectContribution(
  contributionId: string,
  payload: RejectContributionPayload,
): Promise<AdminContributionResponse> {
  const { data } = await apiClient.post(
    `/admin/contributions/${contributionId}/reject`,
    payload,
  );
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/admin-contributions.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/api/admin-contributions.ts lib/api/admin-contributions.test.ts
git commit -m "feat(admin): add admin contributions API client"
```

---

### Task 5: `lib/api/admin-catalog-imports.ts`

**Files:**
- Create: `lib/api/admin-catalog-imports.ts`
- Test: `lib/api/admin-catalog-imports.test.ts`

**Interfaces:**
- Consumes: `apiClient`; `CatalogImportRequest`,
  `CatalogImportJobStatusResponse` from `./types`.
- Produces: `startCatalogImport`, `fetchCatalogImportStatus` — consumed by
  Task 9.

- [ ] **Step 1: Write the test file**

```ts
// lib/api/admin-catalog-imports.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { startCatalogImport, fetchCatalogImportStatus } from "./admin-catalog-imports";

vi.mock("./client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe("admin-catalog-imports API client", () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.post).mockReset();
  });

  it("starts a catalog import job", async () => {
    const status = { job_id: "job1", status: "pending" };
    vi.mocked(apiClient.post).mockResolvedValue({ data: status });

    const result = await startCatalogImport({ profile: "books" });

    expect(apiClient.post).toHaveBeenCalledWith("/admin/catalog-imports", {
      profile: "books",
    });
    expect(result).toEqual(status);
  });

  it("fetches a catalog import job's status", async () => {
    const status = { job_id: "job1", status: "completed", result: { imported: 5 } };
    vi.mocked(apiClient.get).mockResolvedValue({ data: status });

    const result = await fetchCatalogImportStatus("job1");

    expect(apiClient.get).toHaveBeenCalledWith("/admin/catalog-imports/job1");
    expect(result).toEqual(status);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/admin-catalog-imports.test.ts`
Expected: FAIL — `Cannot find module './admin-catalog-imports'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/api/admin-catalog-imports.ts
import { apiClient } from "./client";
import type { CatalogImportJobStatusResponse, CatalogImportRequest } from "./types";

export async function startCatalogImport(
  payload: CatalogImportRequest,
): Promise<CatalogImportJobStatusResponse> {
  const { data } = await apiClient.post("/admin/catalog-imports", payload);
  return data;
}

export async function fetchCatalogImportStatus(
  jobId: string,
): Promise<CatalogImportJobStatusResponse> {
  const { data } = await apiClient.get(`/admin/catalog-imports/${jobId}`);
  return data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/admin-catalog-imports.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/api/admin-catalog-imports.ts lib/api/admin-catalog-imports.test.ts
git commit -m "feat(admin): add admin catalog imports API client"
```

---

### Task 6: `hooks/useAdminUsers.ts`

**Files:**
- Create: `hooks/useAdminUsers.ts`
- Test: `hooks/useAdminUsers.test.tsx`

**Interfaces:**
- Consumes: all functions from `lib/api/admin-users.ts` (Task 2);
  `AdminUserListParams` from `lib/api/types.ts`.
- Produces: `useAdminUsers(params)`, `useActivateUser()`,
  `useDeactivateUser()`, `usePromoteUser()`, `useDemoteUser()`,
  `useResetUserPassword()` — consumed by Tasks 12, 13, 22.

Look at `hooks/useContributions.test.tsx` first for the exact
QueryClientProvider wrapper pattern used in this repo's hook tests before
writing this task's test file — reuse that wrapper verbatim.

- [ ] **Step 1: Write the test file**

```tsx
// hooks/useAdminUsers.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminUsersApi from "@/lib/api/admin-users";
import {
  useAdminUsers,
  useActivateUser,
  useDeactivateUser,
  usePromoteUser,
  useDemoteUser,
  useResetUserPassword,
} from "./useAdminUsers";

vi.mock("@/lib/api/admin-users");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminUsers hooks", () => {
  beforeEach(() => {
    vi.mocked(adminUsersApi.fetchAdminUsers).mockReset();
    vi.mocked(adminUsersApi.activateUser).mockReset();
    vi.mocked(adminUsersApi.deactivateUser).mockReset();
    vi.mocked(adminUsersApi.promoteUser).mockReset();
    vi.mocked(adminUsersApi.demoteUser).mockReset();
    vi.mocked(adminUsersApi.resetUserPassword).mockReset();
  });

  it("useAdminUsers fetches a page of users", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(adminUsersApi.fetchAdminUsers).mockResolvedValue(page);

    const { result } = renderHook(() => useAdminUsers({ limit: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
    expect(adminUsersApi.fetchAdminUsers).toHaveBeenCalledWith({ limit: 10 });
  });

  it("useActivateUser calls activateUser", async () => {
    vi.mocked(adminUsersApi.activateUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: true,
      is_admin: false,
    });

    const { result } = renderHook(() => useActivateUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.activateUser).toHaveBeenCalledWith("u1");
  });

  it("useDeactivateUser calls deactivateUser", async () => {
    vi.mocked(adminUsersApi.deactivateUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: false,
      is_admin: false,
    });

    const { result } = renderHook(() => useDeactivateUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.deactivateUser).toHaveBeenCalledWith("u1");
  });

  it("usePromoteUser calls promoteUser", async () => {
    vi.mocked(adminUsersApi.promoteUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: true,
      is_admin: true,
    });

    const { result } = renderHook(() => usePromoteUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.promoteUser).toHaveBeenCalledWith("u1");
  });

  it("useDemoteUser calls demoteUser", async () => {
    vi.mocked(adminUsersApi.demoteUser).mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      username: "a",
      display_name: "A",
      is_active: true,
      is_admin: false,
    });

    const { result } = renderHook(() => useDemoteUser(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.demoteUser).toHaveBeenCalledWith("u1");
  });

  it("useResetUserPassword calls resetUserPassword", async () => {
    vi.mocked(adminUsersApi.resetUserPassword).mockResolvedValue({ reset_token: "tok" });

    const { result } = renderHook(() => useResetUserPassword(), { wrapper: createWrapper() });
    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminUsersApi.resetUserPassword).toHaveBeenCalledWith("u1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useAdminUsers.test.tsx`
Expected: FAIL — `Cannot find module './useAdminUsers'`

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useAdminUsers.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUser,
  deactivateUser,
  demoteUser,
  fetchAdminUsers,
  promoteUser,
  resetUserPassword,
} from "@/lib/api/admin-users";
import type { AdminUserListParams } from "@/lib/api/types";

export function useAdminUsers(params: AdminUserListParams = {}) {
  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () => fetchAdminUsers(params),
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function usePromoteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => promoteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useDemoteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => demoteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (userId: string) => resetUserPassword(userId),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useAdminUsers.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdminUsers.ts hooks/useAdminUsers.test.tsx
git commit -m "feat(admin): add useAdminUsers hooks"
```

---

### Task 7: `hooks/useAdminAuditLogs.ts`

**Files:**
- Create: `hooks/useAdminAuditLogs.ts`
- Test: `hooks/useAdminAuditLogs.test.tsx`

**Interfaces:**
- Consumes: `fetchAuditLogs` from `lib/api/admin-audit-logs.ts` (Task 3);
  `AdminAuditLogListParams` from `lib/api/types.ts`.
- Produces: `useAdminAuditLogs(params)` — consumed by Task 14/23.

- [ ] **Step 1: Write the test file**

```tsx
// hooks/useAdminAuditLogs.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminAuditLogsApi from "@/lib/api/admin-audit-logs";
import { useAdminAuditLogs } from "./useAdminAuditLogs";

vi.mock("@/lib/api/admin-audit-logs");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminAuditLogs", () => {
  beforeEach(() => {
    vi.mocked(adminAuditLogsApi.fetchAuditLogs).mockReset();
  });

  it("fetches a page of audit logs with params", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(adminAuditLogsApi.fetchAuditLogs).mockResolvedValue(page);

    const { result } = renderHook(() => useAdminAuditLogs({ action: "promote_user" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(page);
    expect(adminAuditLogsApi.fetchAuditLogs).toHaveBeenCalledWith({ action: "promote_user" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useAdminAuditLogs.test.tsx`
Expected: FAIL — `Cannot find module './useAdminAuditLogs'`

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useAdminAuditLogs.ts
import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/api/admin-audit-logs";
import type { AdminAuditLogListParams } from "@/lib/api/types";

export function useAdminAuditLogs(params: AdminAuditLogListParams = {}) {
  return useQuery({
    queryKey: ["admin", "audit-logs", params],
    queryFn: () => fetchAuditLogs(params),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useAdminAuditLogs.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdminAuditLogs.ts hooks/useAdminAuditLogs.test.tsx
git commit -m "feat(admin): add useAdminAuditLogs hook"
```

---

### Task 8: `hooks/useAdminContributions.ts`

**Files:**
- Create: `hooks/useAdminContributions.ts`
- Test: `hooks/useAdminContributions.test.tsx`

**Interfaces:**
- Consumes: all functions from `lib/api/admin-contributions.ts` (Task 4);
  `ContributionStatus`, `RejectContributionPayload` from `lib/api/types.ts`.
- Produces: `useAdminContributions(status)`, `useClaimContribution()`,
  `useContributionDiff(contributionId)`, `useApproveContribution()`,
  `useRejectContribution()` — consumed by Tasks 16, 17, 18, 24.

- [ ] **Step 1: Write the test file**

```tsx
// hooks/useAdminContributions.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminContributionsApi from "@/lib/api/admin-contributions";
import {
  useAdminContributions,
  useClaimContribution,
  useContributionDiff,
  useApproveContribution,
  useRejectContribution,
} from "./useAdminContributions";

vi.mock("@/lib/api/admin-contributions");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminContributions hooks", () => {
  beforeEach(() => {
    vi.mocked(adminContributionsApi.fetchAdminContributions).mockReset();
    vi.mocked(adminContributionsApi.claimContribution).mockReset();
    vi.mocked(adminContributionsApi.fetchContributionDiff).mockReset();
    vi.mocked(adminContributionsApi.approveContribution).mockReset();
    vi.mocked(adminContributionsApi.rejectContribution).mockReset();
  });

  it("useAdminContributions fetches a page by status", async () => {
    const page = { items: [], total: 0, limit: 10, offset: 0 };
    vi.mocked(adminContributionsApi.fetchAdminContributions).mockResolvedValue(page);

    const { result } = renderHook(() => useAdminContributions({ status: "submitted" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.fetchAdminContributions).toHaveBeenCalledWith({
      status: "submitted",
    });
  });

  it("useClaimContribution calls claimContribution", async () => {
    vi.mocked(adminContributionsApi.claimContribution).mockResolvedValue({
      id: "c1",
    } as never);

    const { result } = renderHook(() => useClaimContribution(), { wrapper: createWrapper() });
    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.claimContribution).toHaveBeenCalledWith("c1");
  });

  it("useContributionDiff fetches a diff when enabled", async () => {
    const diff = { proposed: {}, current: null, warnings: [] };
    vi.mocked(adminContributionsApi.fetchContributionDiff).mockResolvedValue(diff);

    const { result } = renderHook(() => useContributionDiff("c1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(diff);
  });

  it("useApproveContribution calls approveContribution", async () => {
    vi.mocked(adminContributionsApi.approveContribution).mockResolvedValue({
      id: "c1",
    } as never);

    const { result } = renderHook(() => useApproveContribution(), {
      wrapper: createWrapper(),
    });
    result.current.mutate("c1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.approveContribution).toHaveBeenCalledWith("c1");
  });

  it("useRejectContribution calls rejectContribution with notes", async () => {
    vi.mocked(adminContributionsApi.rejectContribution).mockResolvedValue({
      id: "c1",
    } as never);

    const { result } = renderHook(() => useRejectContribution(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ contributionId: "c1", payload: { notes: "bad" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminContributionsApi.rejectContribution).toHaveBeenCalledWith("c1", {
      notes: "bad",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useAdminContributions.test.tsx`
Expected: FAIL — `Cannot find module './useAdminContributions'`

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useAdminContributions.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveContribution,
  claimContribution,
  fetchAdminContributions,
  fetchContributionDiff,
  rejectContribution,
} from "@/lib/api/admin-contributions";
import type { ContributionStatus, RejectContributionPayload } from "@/lib/api/types";

export function useAdminContributions(
  params: { status?: ContributionStatus; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["admin", "contributions", params],
    queryFn: () => fetchAdminContributions(params),
  });
}

export function useClaimContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => claimContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }),
  });
}

export function useContributionDiff(contributionId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "contributions", contributionId, "diff"],
    queryFn: () => fetchContributionDiff(contributionId as string),
    enabled: Boolean(contributionId),
  });
}

export function useApproveContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contributionId: string) => approveContribution(contributionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }),
  });
}

export function useRejectContribution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contributionId,
      payload,
    }: {
      contributionId: string;
      payload: RejectContributionPayload;
    }) => rejectContribution(contributionId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "contributions"] }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useAdminContributions.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdminContributions.ts hooks/useAdminContributions.test.tsx
git commit -m "feat(admin): add useAdminContributions hooks"
```

---

### Task 9: `hooks/useAdminCatalogImports.ts`

**Files:**
- Create: `hooks/useAdminCatalogImports.ts`
- Test: `hooks/useAdminCatalogImports.test.tsx`

**Interfaces:**
- Consumes: `startCatalogImport`, `fetchCatalogImportStatus` from
  `lib/api/admin-catalog-imports.ts` (Task 5); `CatalogImportRequest` from
  `lib/api/types.ts`.
- Produces: `useStartCatalogImport()`, `useCatalogImportStatus(jobId)` —
  consumed by Tasks 19, 20, 25.

Terminal status values from the spec: the API returns `status` as a free
string, not an enum. Treat `"completed"`, `"failed"`, and `"errored"` as
terminal (stop polling); anything else keeps polling every 2 seconds. This
list matches the spec's guidance that `result` is only populated on
completion — check `result != null` too as a completion signal.

- [ ] **Step 1: Write the test file**

```tsx
// hooks/useAdminCatalogImports.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import * as adminCatalogImportsApi from "@/lib/api/admin-catalog-imports";
import { useStartCatalogImport, useCatalogImportStatus } from "./useAdminCatalogImports";

vi.mock("@/lib/api/admin-catalog-imports");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAdminCatalogImports hooks", () => {
  beforeEach(() => {
    vi.mocked(adminCatalogImportsApi.startCatalogImport).mockReset();
    vi.mocked(adminCatalogImportsApi.fetchCatalogImportStatus).mockReset();
  });

  it("useStartCatalogImport calls startCatalogImport", async () => {
    vi.mocked(adminCatalogImportsApi.startCatalogImport).mockResolvedValue({
      job_id: "job1",
      status: "pending",
    });

    const { result } = renderHook(() => useStartCatalogImport(), {
      wrapper: createWrapper(),
    });
    result.current.mutate({ profile: "books" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminCatalogImportsApi.startCatalogImport).toHaveBeenCalledWith({
      profile: "books",
    });
  });

  it("useCatalogImportStatus fetches status when jobId is set", async () => {
    vi.mocked(adminCatalogImportsApi.fetchCatalogImportStatus).mockResolvedValue({
      job_id: "job1",
      status: "completed",
      result: { imported: 3 },
    });

    const { result } = renderHook(() => useCatalogImportStatus("job1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("completed");
  });

  it("useCatalogImportStatus is disabled without a jobId", () => {
    const { result } = renderHook(() => useCatalogImportStatus(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(adminCatalogImportsApi.fetchCatalogImportStatus).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useAdminCatalogImports.test.tsx`
Expected: FAIL — `Cannot find module './useAdminCatalogImports'`

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useAdminCatalogImports.ts
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchCatalogImportStatus,
  startCatalogImport,
} from "@/lib/api/admin-catalog-imports";
import type { CatalogImportJobStatusResponse, CatalogImportRequest } from "@/lib/api/types";

const TERMINAL_STATUSES = ["completed", "failed", "errored"];

function isTerminal(status: CatalogImportJobStatusResponse | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.includes(status.status) || status.result != null;
}

export function useStartCatalogImport() {
  return useMutation({
    mutationFn: (payload: CatalogImportRequest) => startCatalogImport(payload),
  });
}

export function useCatalogImportStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: ["admin", "catalog-imports", jobId],
    queryFn: () => fetchCatalogImportStatus(jobId as string),
    enabled: Boolean(jobId),
    refetchInterval: (query) => (isTerminal(query.state.data) ? false : 2000),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useAdminCatalogImports.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useAdminCatalogImports.ts hooks/useAdminCatalogImports.test.tsx
git commit -m "feat(admin): add useAdminCatalogImports hooks"
```

---

### Task 10: ~~`middleware.ts` admin route gate~~ — STRUCK, already exists as `proxy.ts`

**Do not execute this task.** Discovered mid-plan-execution: this branch
already has `proxy.ts` (repo root) + `proxy.test.ts`, added in commits
`4980669`, `748c012`, `bc0339a`, `086c3d4`, `04f4d09` — predating this
plan. Next.js renamed the middleware convention from `middleware.ts` to
`proxy.ts`; this repo already migrated. `proxy.ts`'s `config.matcher`
already includes `/admin/:path*`, already decodes the `access_token` JWT's
`is_admin` claim for a fast edge redirect, and `proxy.test.ts` already has
10 passing tests covering the no-cookie, non-admin, and admin cases this
task would have duplicated.

It also goes further than this task specified: it's explicitly documented
as a **UX-only fast path**, with the **real** authorization backstop living
in `app/(app)/admin/catalog/layout.tsx`, which calls `GET /users/me` with
the live bearer token and trusts only the API's verified response. Task 21
below is revised to give `/admin/users`, `/admin/audit-logs`,
`/admin/contributions`, `/admin/catalog-imports` that same real backstop.

No files created, no commit made for this task — it is a no-op by design.

---

### Task 11: i18n strings

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/uk.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `admin.*` namespace, consumed by every component task
  (12-20) and every page task (21-25) via `useTranslations("admin...")`.

- [ ] **Step 1: Add the `admin` key to `messages/en.json`**

Add this as a new top-level key (find the closing `}` of the last
top-level key, e.g. `"ai"`, and insert a comma + this block before the
final closing brace):

```json
"admin": {
  "nav": {
    "title": "Admin",
    "users": "Users",
    "auditLogs": "Audit logs",
    "contributions": "Contributions",
    "catalogImports": "Catalog imports"
  },
  "users": {
    "pageTitle": "User management",
    "filters": {
      "emailLabel": "Email",
      "emailPlaceholder": "Filter by email",
      "usernameLabel": "Username",
      "usernamePlaceholder": "Filter by username",
      "statusLabel": "Status",
      "statusAll": "All",
      "statusActive": "Active",
      "statusInactive": "Inactive",
      "roleLabel": "Role",
      "roleAll": "All",
      "roleAdmin": "Admin",
      "roleUser": "User"
    },
    "table": {
      "email": "Email",
      "username": "Username",
      "displayName": "Display name",
      "status": "Status",
      "role": "Role",
      "actions": "Actions",
      "activeBadge": "Active",
      "inactiveBadge": "Inactive",
      "adminBadge": "Admin"
    },
    "actions": {
      "activate": "Activate",
      "deactivate": "Deactivate",
      "promote": "Promote to admin",
      "demote": "Demote to user",
      "resetPassword": "Reset password"
    },
    "empty": "No users found."
  },
  "passwordResetDialog": {
    "title": "Password reset token",
    "description": "Share this one-time token with the user so they can set a new password. It will not be shown again.",
    "copy": "Copy",
    "copied": "Copied!",
    "close": "Close"
  },
  "auditLogs": {
    "pageTitle": "Audit logs",
    "filters": {
      "actorIdLabel": "Actor ID",
      "actorIdPlaceholder": "Filter by actor UUID",
      "actionLabel": "Action",
      "actionAll": "All actions",
      "targetTypeLabel": "Target type",
      "targetTypeAll": "All targets",
      "startDateLabel": "From",
      "endDateLabel": "To"
    },
    "table": {
      "actor": "Actor",
      "action": "Action",
      "targetType": "Target type",
      "targetId": "Target ID",
      "createdAt": "When"
    },
    "action": {
      "approve_contribution": "Approved contribution",
      "reject_contribution": "Rejected contribution",
      "claim_contribution": "Claimed contribution",
      "activate_user": "Activated user",
      "deactivate_user": "Deactivated user",
      "promote_user": "Promoted user",
      "demote_user": "Demoted user"
    },
    "targetType": {
      "contribution": "Contribution",
      "user": "User"
    },
    "empty": "No audit log entries found."
  },
  "contributions": {
    "pageTitle": "Contribution moderation",
    "statusFilterLabel": "Status",
    "empty": "No contributions in this status.",
    "claim": "Claim",
    "viewDiff": "View diff",
    "approve": "Approve",
    "reject": "Reject",
    "reviewNotes": "Review notes",
    "warnings": "Warnings",
    "status": {
      "draft": "Draft",
      "submitted": "Submitted",
      "under_review": "Under review",
      "approved": "Approved",
      "rejected": "Rejected",
      "merged": "Merged"
    }
  },
  "diffViewer": {
    "proposed": "Proposed",
    "current": "Current",
    "noCurrent": "No existing record — this is a new entity.",
    "warningsTitle": "Warnings"
  },
  "rejectDialog": {
    "title": "Reject contribution",
    "description": "Explain why this contribution is being rejected. The contributor will see these notes.",
    "notesLabel": "Notes",
    "notesPlaceholder": "Reason for rejection",
    "confirm": "Reject"
  },
  "catalogImports": {
    "pageTitle": "Catalog imports",
    "profileLabel": "Profile",
    "profileBooks": "Books",
    "profileComics": "Comics",
    "profileManga": "Manga",
    "start": "Start import",
    "starting": "Starting...",
    "statusLabel": "Status",
    "jobId": "Job ID",
    "result": "Result"
  }
}
```

- [ ] **Step 2: Add the same key structure to `messages/uk.json`**

Use these Ukrainian translations for the same nested structure (identical
keys, translated values):

```json
"admin": {
  "nav": {
    "title": "Адміністрування",
    "users": "Користувачі",
    "auditLogs": "Журнал аудиту",
    "contributions": "Внески",
    "catalogImports": "Імпорт каталогу"
  },
  "users": {
    "pageTitle": "Керування користувачами",
    "filters": {
      "emailLabel": "Email",
      "emailPlaceholder": "Фільтр за email",
      "usernameLabel": "Ім'я користувача",
      "usernamePlaceholder": "Фільтр за ім'ям користувача",
      "statusLabel": "Статус",
      "statusAll": "Усі",
      "statusActive": "Активні",
      "statusInactive": "Неактивні",
      "roleLabel": "Роль",
      "roleAll": "Усі",
      "roleAdmin": "Адміністратор",
      "roleUser": "Користувач"
    },
    "table": {
      "email": "Email",
      "username": "Ім'я користувача",
      "displayName": "Відображуване ім'я",
      "status": "Статус",
      "role": "Роль",
      "actions": "Дії",
      "activeBadge": "Активний",
      "inactiveBadge": "Неактивний",
      "adminBadge": "Адміністратор"
    },
    "actions": {
      "activate": "Активувати",
      "deactivate": "Деактивувати",
      "promote": "Підвищити до адміністратора",
      "demote": "Понизити до користувача",
      "resetPassword": "Скинути пароль"
    },
    "empty": "Користувачів не знайдено."
  },
  "passwordResetDialog": {
    "title": "Токен скидання пароля",
    "description": "Поділіться цим одноразовим токеном із користувачем, щоб він міг встановити новий пароль. Він більше не показуватиметься.",
    "copy": "Копіювати",
    "copied": "Скопійовано!",
    "close": "Закрити"
  },
  "auditLogs": {
    "pageTitle": "Журнал аудиту",
    "filters": {
      "actorIdLabel": "ID виконавця",
      "actorIdPlaceholder": "Фільтр за UUID виконавця",
      "actionLabel": "Дія",
      "actionAll": "Усі дії",
      "targetTypeLabel": "Тип цілі",
      "targetTypeAll": "Усі цілі",
      "startDateLabel": "Від",
      "endDateLabel": "До"
    },
    "table": {
      "actor": "Виконавець",
      "action": "Дія",
      "targetType": "Тип цілі",
      "targetId": "ID цілі",
      "createdAt": "Коли"
    },
    "action": {
      "approve_contribution": "Схвалено внесок",
      "reject_contribution": "Відхилено внесок",
      "claim_contribution": "Взято внесок у роботу",
      "activate_user": "Активовано користувача",
      "deactivate_user": "Деактивовано користувача",
      "promote_user": "Підвищено користувача",
      "demote_user": "Понижено користувача"
    },
    "targetType": {
      "contribution": "Внесок",
      "user": "Користувач"
    },
    "empty": "Записів журналу аудиту не знайдено."
  },
  "contributions": {
    "pageTitle": "Модерація внесків",
    "statusFilterLabel": "Статус",
    "empty": "Немає внесків у цьому статусі.",
    "claim": "Взяти в роботу",
    "viewDiff": "Переглянути зміни",
    "approve": "Схвалити",
    "reject": "Відхилити",
    "reviewNotes": "Примітки рецензента",
    "warnings": "Попередження",
    "status": {
      "draft": "Чернетка",
      "submitted": "Подано",
      "under_review": "На розгляді",
      "approved": "Схвалено",
      "rejected": "Відхилено",
      "merged": "Об'єднано"
    }
  },
  "diffViewer": {
    "proposed": "Запропоновано",
    "current": "Поточне",
    "noCurrent": "Немає існуючого запису — це нова сутність.",
    "warningsTitle": "Попередження"
  },
  "rejectDialog": {
    "title": "Відхилити внесок",
    "description": "Поясніть, чому цей внесок відхиляється. Автор побачить ці примітки.",
    "notesLabel": "Примітки",
    "notesPlaceholder": "Причина відхилення",
    "confirm": "Відхилити"
  },
  "catalogImports": {
    "pageTitle": "Імпорт каталогу",
    "profileLabel": "Профіль",
    "profileBooks": "Книги",
    "profileComics": "Комікси",
    "profileManga": "Манґа",
    "start": "Почати імпорт",
    "starting": "Починається...",
    "statusLabel": "Статус",
    "jobId": "ID завдання",
    "result": "Результат"
  }
}
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json')); JSON.parse(require('fs').readFileSync('messages/uk.json')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/uk.json
git commit -m "feat(admin): add admin i18n strings"
```

---

### Task 12: `components/admin/user-table.tsx`

**Files:**
- Create: `components/admin/user-table.tsx`
- Create: `components/admin/user-table.stories.tsx`
- Create: `components/admin/user-table.test.tsx`

**Interfaces:**
- Consumes: `AdminUserResponse` from `lib/api/types.ts`; `useActivateUser`,
  `useDeactivateUser`, `usePromoteUser`, `useDemoteUser` from
  `hooks/useAdminUsers.ts` (Task 6); `PasswordResetDialog` from Task 13
  (component prop, not import — pass an `onResetPassword` callback instead
  so this table stays independent of the dialog's internals).
- Produces: `UserTable` component with props
  `{ users: AdminUserResponse[]; onResetPassword: (userId: string) => void }` —
  consumed by Task 22.

Look at `components/friends/friend-list-item.tsx` first for the row-item +
dropdown-actions pattern already used in this repo before writing the
component — reuse `DropdownMenu` from `components/ui/dropdown-menu.tsx`
for per-row actions instead of one button per action, to keep each row
compact.

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/user-table.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { UserTable } from "./user-table";
import type { AdminUserResponse } from "@/lib/api/types";

vi.mock("@/hooks/useAdminUsers", () => ({
  useActivateUser: () => ({ mutate: vi.fn(), isPending: false }),
  useDeactivateUser: () => ({ mutate: vi.fn(), isPending: false }),
  usePromoteUser: () => ({ mutate: vi.fn(), isPending: false }),
  useDemoteUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

const users: AdminUserResponse[] = [
  {
    id: "u1",
    email: "a@b.com",
    username: "alice",
    display_name: "Alice",
    is_active: true,
    is_admin: false,
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("UserTable", () => {
  it("renders a row per user", () => {
    renderWithIntl(<UserTable users={users} onResetPassword={vi.fn()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", () => {
    renderWithIntl(<UserTable users={[]} onResetPassword={vi.fn()} />);
    expect(screen.getByText("No users found.")).toBeInTheDocument();
  });

  it("calls onResetPassword when the reset password action is clicked", () => {
    const onResetPassword = vi.fn();
    renderWithIntl(<UserTable users={users} onResetPassword={onResetPassword} />);

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    fireEvent.click(screen.getByText("Reset password"));

    expect(onResetPassword).toHaveBeenCalledWith("u1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/user-table.test.tsx`
Expected: FAIL — `Cannot find module './user-table'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/user-table.tsx
"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useActivateUser,
  useDeactivateUser,
  useDemoteUser,
  usePromoteUser,
} from "@/hooks/useAdminUsers";
import type { AdminUserResponse } from "@/lib/api/types";

export function UserTable({
  users,
  onResetPassword,
}: {
  users: AdminUserResponse[];
  onResetPassword: (userId: string) => void;
}) {
  const t = useTranslations("admin.users");
  const activate = useActivateUser();
  const deactivate = useDeactivateUser();
  const promote = usePromoteUser();
  const demote = useDemoteUser();

  if (users.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground border-border border-b text-left">
          <th className="py-2 font-medium">{t("table.email")}</th>
          <th className="py-2 font-medium">{t("table.username")}</th>
          <th className="py-2 font-medium">{t("table.displayName")}</th>
          <th className="py-2 font-medium">{t("table.status")}</th>
          <th className="py-2 font-medium">{t("table.role")}</th>
          <th className="py-2 font-medium">{t("table.actions")}</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-border border-b last:border-b-0">
            <td className="py-2">{user.email}</td>
            <td className="py-2">{user.username}</td>
            <td className="py-2">{user.display_name}</td>
            <td className="py-2">
              <Badge variant={user.is_active ? "secondary" : "outline"}>
                {user.is_active ? t("table.activeBadge") : t("table.inactiveBadge")}
              </Badge>
            </td>
            <td className="py-2">
              {user.is_admin && <Badge variant="secondary">{t("table.adminBadge")}</Badge>}
            </td>
            <td className="py-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="sm">
                      {t("table.actions")}
                    </Button>
                  }
                />
                <DropdownMenuContent>
                  {user.is_active ? (
                    <DropdownMenuItem onClick={() => deactivate.mutate(user.id)}>
                      {t("actions.deactivate")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => activate.mutate(user.id)}>
                      {t("actions.activate")}
                    </DropdownMenuItem>
                  )}
                  {user.is_admin ? (
                    <DropdownMenuItem onClick={() => demote.mutate(user.id)}>
                      {t("actions.demote")}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => promote.mutate(user.id)}>
                      {t("actions.promote")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onResetPassword(user.id)}>
                    {t("actions.resetPassword")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Note: the test clicks a button named "Actions" (`t("table.actions")` ===
`"Actions"` in English) to open the dropdown — this matches the trigger
button's label above.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/user-table.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/user-table.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { UserTable } from "./user-table";

const meta: Meta<typeof UserTable> = {
  title: "Admin/UserTable",
  component: UserTable,
};
export default meta;

type Story = StoryObj<typeof UserTable>;

const users = [
  {
    id: "u1",
    email: "alice@example.com",
    username: "alice",
    display_name: "Alice",
    is_active: true,
    is_admin: false,
  },
  {
    id: "u2",
    email: "bob@example.com",
    username: "bob",
    display_name: "Bob",
    is_active: false,
    is_admin: true,
  },
];

export const Default: Story = {
  args: { users, onResetPassword: () => {} },
};

export const Empty: Story = {
  args: { users: [], onResetPassword: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/user-table.tsx components/admin/user-table.stories.tsx components/admin/user-table.test.tsx
git commit -m "feat(admin): add UserTable component"
```

---

### Task 13: `components/admin/password-reset-dialog.tsx`

**Files:**
- Create: `components/admin/password-reset-dialog.tsx`
- Create: `components/admin/password-reset-dialog.stories.tsx`
- Create: `components/admin/password-reset-dialog.test.tsx`

**Interfaces:**
- Consumes: `useResetUserPassword` from `hooks/useAdminUsers.ts` (Task 6);
  `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`,
  `DialogDescription`, `DialogFooter` from `components/ui/dialog.tsx`.
- Produces: `PasswordResetDialog` component with props
  `{ userId: string | undefined; open: boolean; onOpenChange: (open: boolean) => void }` —
  consumed by Task 22.

Look at `components/friends/unfriend-dialog.tsx` (already read above) as
the direct template for this dialog's structure — same shape, but this
one triggers the mutation on open (via `useEffect`) rather than waiting
for a confirm click, since there's nothing to confirm — resetting is
triggered from the table's menu action and the dialog's only job is to
display the resulting token.

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/password-reset-dialog.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { PasswordResetDialog } from "./password-reset-dialog";
import * as useAdminUsersHooks from "@/hooks/useAdminUsers";

vi.mock("@/hooks/useAdminUsers");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("PasswordResetDialog", () => {
  beforeEach(() => {
    vi.mocked(useAdminUsersHooks.useResetUserPassword).mockReturnValue({
      mutate: vi.fn(),
      data: undefined,
      isPending: true,
    } as never);
  });

  it("shows a loading state while the reset is pending", () => {
    renderWithIntl(
      <PasswordResetDialog userId="u1" open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText("Password reset token")).toBeInTheDocument();
  });

  it("shows the reset token once available", () => {
    vi.mocked(useAdminUsersHooks.useResetUserPassword).mockReturnValue({
      mutate: vi.fn(),
      data: { reset_token: "tok-abc-123" },
      isPending: false,
    } as never);

    renderWithIntl(
      <PasswordResetDialog userId="u1" open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByText("tok-abc-123")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/password-reset-dialog.test.tsx`
Expected: FAIL — `Cannot find module './password-reset-dialog'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/password-reset-dialog.tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useResetUserPassword } from "@/hooks/useAdminUsers";

export function PasswordResetDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.passwordResetDialog");
  const resetPassword = useResetUserPassword();

  useEffect(() => {
    if (open && userId) {
      resetPassword.mutate(userId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-trigger when the dialog opens for a (possibly new) userId
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {resetPassword.isPending && <p className="text-sm">...</p>}
        {resetPassword.data && (
          <div className="bg-muted rounded-md p-3">
            <p className="font-mono text-sm break-all">{resetPassword.data.reset_token}</p>
          </div>
        )}
        <DialogFooter>
          {resetPassword.data && (
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(resetPassword.data!.reset_token)}
            >
              {t("copy")}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>{t("close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/password-reset-dialog.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/password-reset-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { PasswordResetDialog } from "./password-reset-dialog";

const meta: Meta<typeof PasswordResetDialog> = {
  title: "Admin/PasswordResetDialog",
  component: PasswordResetDialog,
};
export default meta;

type Story = StoryObj<typeof PasswordResetDialog>;

export const Open: Story = {
  args: { userId: "u1", open: true, onOpenChange: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/password-reset-dialog.tsx components/admin/password-reset-dialog.stories.tsx components/admin/password-reset-dialog.test.tsx
git commit -m "feat(admin): add PasswordResetDialog component"
```

---

### Task 14: `components/admin/audit-log-table.tsx`

**Files:**
- Create: `components/admin/audit-log-table.tsx`
- Create: `components/admin/audit-log-table.stories.tsx`
- Create: `components/admin/audit-log-table.test.tsx`

**Interfaces:**
- Consumes: `AuditLogResponse` from `lib/api/types.ts`.
- Produces: `AuditLogTable` component with props
  `{ logs: AuditLogResponse[] }` — consumed by Task 23. Read-only, no
  mutation hooks.

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/audit-log-table.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AuditLogTable } from "./audit-log-table";
import type { AuditLogResponse } from "@/lib/api/types";

const logs: AuditLogResponse[] = [
  {
    id: "l1",
    actor_id: "u1",
    action: "promote_user",
    target_type: "user",
    target_id: "u2",
    audit_metadata: {},
    ip_address: "127.0.0.1",
    created_at: "2026-07-24T10:00:00Z",
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AuditLogTable", () => {
  it("renders a row per log entry with translated action and target type", () => {
    renderWithIntl(<AuditLogTable logs={logs} />);
    expect(screen.getByText("Promoted user")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.getByText("u2")).toBeInTheDocument();
  });

  it("shows an empty state when there are no logs", () => {
    renderWithIntl(<AuditLogTable logs={[]} />);
    expect(screen.getByText("No audit log entries found.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/audit-log-table.test.tsx`
Expected: FAIL — `Cannot find module './audit-log-table'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/audit-log-table.tsx
"use client";

import { useTranslations } from "next-intl";
import type { AuditLogResponse } from "@/lib/api/types";

export function AuditLogTable({ logs }: { logs: AuditLogResponse[] }) {
  const t = useTranslations("admin.auditLogs");

  if (logs.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground border-border border-b text-left">
          <th className="py-2 font-medium">{t("table.actor")}</th>
          <th className="py-2 font-medium">{t("table.action")}</th>
          <th className="py-2 font-medium">{t("table.targetType")}</th>
          <th className="py-2 font-medium">{t("table.targetId")}</th>
          <th className="py-2 font-medium">{t("table.createdAt")}</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id} className="border-border border-b last:border-b-0">
            <td className="py-2 font-mono text-xs">{log.actor_id}</td>
            <td className="py-2">{t(`action.${log.action}`)}</td>
            <td className="py-2">{t(`targetType.${log.target_type}`)}</td>
            <td className="py-2 font-mono text-xs">{log.target_id}</td>
            <td className="py-2">{new Date(log.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/audit-log-table.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/audit-log-table.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AuditLogTable } from "./audit-log-table";

const meta: Meta<typeof AuditLogTable> = {
  title: "Admin/AuditLogTable",
  component: AuditLogTable,
};
export default meta;

type Story = StoryObj<typeof AuditLogTable>;

const logs = [
  {
    id: "l1",
    actor_id: "u1",
    action: "promote_user" as const,
    target_type: "user" as const,
    target_id: "u2",
    audit_metadata: {},
    ip_address: "127.0.0.1",
    created_at: "2026-07-24T10:00:00Z",
  },
];

export const Default: Story = {
  args: { logs },
};

export const Empty: Story = {
  args: { logs: [] },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/audit-log-table.tsx components/admin/audit-log-table.stories.tsx components/admin/audit-log-table.test.tsx
git commit -m "feat(admin): add AuditLogTable component"
```

---

### Task 15: `components/admin/audit-log-filters.tsx`

**Files:**
- Create: `components/admin/audit-log-filters.tsx`
- Create: `components/admin/audit-log-filters.stories.tsx`
- Create: `components/admin/audit-log-filters.test.tsx`

**Interfaces:**
- Consumes: `AdminAuditLogListParams`, `AuditAction`, `AuditTargetType`
  from `lib/api/types.ts`; `Select`/`SelectTrigger`/`SelectContent`/
  `SelectItem` from `components/ui/select.tsx`; `Input` from
  `components/ui/input.tsx`.
- Produces: `AuditLogFilters` component with props
  `{ value: AdminAuditLogListParams; onChange: (params: AdminAuditLogListParams) => void }` —
  consumed by Task 23. Controlled, same shape as `BookSearchFilters` (read
  above) but with select dropdowns for the enum filters instead of plain
  text inputs.

Look at `components/ui/select.tsx` for the exact `Select`/`SelectTrigger`/
`SelectValue`/`SelectContent`/`SelectItem` API used elsewhere in this repo
(e.g. `components/catalog/admin/book-form.tsx` likely uses it for an enum
field) before writing this component — match that usage exactly rather
than guessing prop names.

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/audit-log-filters.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AuditLogFilters } from "./audit-log-filters";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AuditLogFilters", () => {
  it("calls onChange with the updated actor id", () => {
    const onChange = vi.fn();
    renderWithIntl(<AuditLogFilters value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Actor ID"), {
      target: { value: "u1" },
    });

    expect(onChange).toHaveBeenCalledWith({ actor_id: "u1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/audit-log-filters.test.tsx`
Expected: FAIL — `Cannot find module './audit-log-filters'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/audit-log-filters.tsx
"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminAuditLogListParams, AuditAction, AuditTargetType } from "@/lib/api/types";

const ACTIONS: AuditAction[] = [
  "approve_contribution",
  "reject_contribution",
  "claim_contribution",
  "activate_user",
  "deactivate_user",
  "promote_user",
  "demote_user",
];

const TARGET_TYPES: AuditTargetType[] = ["contribution", "user"];

export function AuditLogFilters({
  value,
  onChange,
}: {
  value: AdminAuditLogListParams;
  onChange: (params: AdminAuditLogListParams) => void;
}) {
  const t = useTranslations("admin.auditLogs.filters");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-actor-id" className="text-sm font-medium">
          {t("actorIdLabel")}
        </label>
        <Input
          id="filter-actor-id"
          placeholder={t("actorIdPlaceholder")}
          value={value.actor_id ?? ""}
          onChange={(e) => onChange({ ...value, actor_id: e.target.value || undefined })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-action" className="text-sm font-medium">
          {t("actionLabel")}
        </label>
        <Select
          value={value.action ?? "all"}
          onValueChange={(next) =>
            onChange({ ...value, action: next === "all" ? undefined : (next as AuditAction) })
          }
        >
          <SelectTrigger id="filter-action">
            <SelectValue placeholder={t("actionAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("actionAll")}</SelectItem>
            {ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-target-type" className="text-sm font-medium">
          {t("targetTypeLabel")}
        </label>
        <Select
          value={value.target_type ?? "all"}
          onValueChange={(next) =>
            onChange({
              ...value,
              target_type: next === "all" ? undefined : (next as AuditTargetType),
            })
          }
        >
          <SelectTrigger id="filter-target-type">
            <SelectValue placeholder={t("targetTypeAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("targetTypeAll")}</SelectItem>
            {TARGET_TYPES.map((targetType) => (
              <SelectItem key={targetType} value={targetType}>
                {targetType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-start-date" className="text-sm font-medium">
          {t("startDateLabel")}
        </label>
        <Input
          id="filter-start-date"
          type="date"
          value={value.start_date?.slice(0, 10) ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
```

Adjust the `Select` import names to whatever `components/ui/select.tsx`
actually exports if it differs from `SelectValue`/`SelectTrigger` (check
Step 0 above) — this is the one place in this task where the subagent
must read the real file before finalizing, since guessing wrong here
breaks compilation.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/audit-log-filters.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/audit-log-filters.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AuditLogFilters } from "./audit-log-filters";

const meta: Meta<typeof AuditLogFilters> = {
  title: "Admin/AuditLogFilters",
  component: AuditLogFilters,
};
export default meta;

type Story = StoryObj<typeof AuditLogFilters>;

export const Default: Story = {
  args: { value: {}, onChange: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/audit-log-filters.tsx components/admin/audit-log-filters.stories.tsx components/admin/audit-log-filters.test.tsx
git commit -m "feat(admin): add AuditLogFilters component"
```

---

### Task 16: `components/admin/contribution-review-list.tsx`

**Files:**
- Create: `components/admin/contribution-review-list.tsx`
- Create: `components/admin/contribution-review-list.stories.tsx`
- Create: `components/admin/contribution-review-list.test.tsx`

**Interfaces:**
- Consumes: `AdminContributionResponse` from `lib/api/types.ts`;
  `useClaimContribution` from `hooks/useAdminContributions.ts` (Task 8).
- Produces: `ContributionReviewList` component with props
  `{ contributions: AdminContributionResponse[]; onSelect: (contributionId: string) => void }` —
  consumed by Task 24 (selecting opens the diff viewer + approve/reject
  actions on Task 24's page, this list itself only shows the claim action
  and a "view diff" trigger).

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/contribution-review-list.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ContributionReviewList } from "./contribution-review-list";
import * as useAdminContributionsHooks from "@/hooks/useAdminContributions";
import type { AdminContributionResponse } from "@/lib/api/types";

vi.mock("@/hooks/useAdminContributions");

const contributions: AdminContributionResponse[] = [
  {
    id: "c1",
    user_id: "u1",
    kind: "book_create",
    target_id: null,
    payload: {},
    status: "submitted",
    reviewer_id: null,
    review_notes: null,
    created_at: "2026-07-24T10:00:00Z",
    updated_at: "2026-07-24T10:00:00Z",
    warnings: [],
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ContributionReviewList", () => {
  beforeEachClaimMock();

  it("renders a card per contribution", () => {
    renderWithIntl(
      <ContributionReviewList contributions={contributions} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("book_create")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("shows an empty state when there are no contributions", () => {
    renderWithIntl(<ContributionReviewList contributions={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("No contributions in this status.")).toBeInTheDocument();
  });

  it("calls onSelect when 'View diff' is clicked", () => {
    const onSelect = vi.fn();
    renderWithIntl(
      <ContributionReviewList contributions={contributions} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View diff" }));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });
});

function beforeEachClaimMock() {
  vi.mocked(useAdminContributionsHooks.useClaimContribution).mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as never);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/contribution-review-list.test.tsx`
Expected: FAIL — `Cannot find module './contribution-review-list'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/contribution-review-list.tsx
"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useClaimContribution } from "@/hooks/useAdminContributions";
import type { AdminContributionResponse, ContributionStatus } from "@/lib/api/types";

export function ContributionReviewList({
  contributions,
  onSelect,
}: {
  contributions: AdminContributionResponse[];
  onSelect: (contributionId: string) => void;
}) {
  const t = useTranslations("admin.contributions");
  const claim = useClaimContribution();

  if (contributions.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {contributions.map((contribution) => (
        <Card key={contribution.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{contribution.kind}</CardTitle>
            <Badge variant="secondary">
              {t(`status.${contribution.status as ContributionStatus}`)}
            </Badge>
          </CardHeader>
          <CardContent>
            {contribution.warnings.length > 0 && (
              <p className="text-destructive text-xs">{contribution.warnings.join(", ")}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {!contribution.reviewer_id && (
              <Button
                variant="outline"
                size="sm"
                disabled={claim.isPending}
                onClick={() => claim.mutate(contribution.id)}
              >
                {t("claim")}
              </Button>
            )}
            <Button size="sm" onClick={() => onSelect(contribution.id)}>
              {t("viewDiff")}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/contribution-review-list.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/contribution-review-list.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ContributionReviewList } from "./contribution-review-list";

const meta: Meta<typeof ContributionReviewList> = {
  title: "Admin/ContributionReviewList",
  component: ContributionReviewList,
};
export default meta;

type Story = StoryObj<typeof ContributionReviewList>;

const contributions = [
  {
    id: "c1",
    user_id: "u1",
    kind: "book_create" as const,
    target_id: null,
    payload: {},
    status: "submitted" as const,
    reviewer_id: null,
    review_notes: null,
    created_at: "2026-07-24T10:00:00Z",
    updated_at: "2026-07-24T10:00:00Z",
    warnings: [],
  },
];

export const Default: Story = {
  args: { contributions, onSelect: () => {} },
};

export const Empty: Story = {
  args: { contributions: [], onSelect: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/contribution-review-list.tsx components/admin/contribution-review-list.stories.tsx components/admin/contribution-review-list.test.tsx
git commit -m "feat(admin): add ContributionReviewList component"
```

---

### Task 17: `components/admin/contribution-diff-viewer.tsx`

**Files:**
- Create: `components/admin/contribution-diff-viewer.tsx`
- Create: `components/admin/contribution-diff-viewer.stories.tsx`
- Create: `components/admin/contribution-diff-viewer.test.tsx`

**Interfaces:**
- Consumes: `ContributionDiffResponse` from `lib/api/types.ts`. Reuses the
  same diff-row computation approach as
  `components/catalog/history/version-diff-viewer.tsx` (already read
  above) but adapted for `proposed`/`current` naming instead of
  `before`/`after`, and `current` can be `null` (new entity, no existing
  record).
- Produces: `ContributionDiffViewer` component with props
  `{ diff: ContributionDiffResponse }` — consumed by Task 24.

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/contribution-diff-viewer.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ContributionDiffViewer } from "./contribution-diff-viewer";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ContributionDiffViewer", () => {
  it("renders changed fields between current and proposed", () => {
    renderWithIntl(
      <ContributionDiffViewer
        diff={{
          proposed: { title: "New Title" },
          current: { title: "Old Title" },
          warnings: [],
        }}
      />,
    );
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("Old Title")).toBeInTheDocument();
    expect(screen.getByText("New Title")).toBeInTheDocument();
  });

  it("shows a no-current-record message when current is null", () => {
    renderWithIntl(
      <ContributionDiffViewer diff={{ proposed: { title: "New" }, current: null, warnings: [] }} />,
    );
    expect(screen.getByText("No existing record — this is a new entity.")).toBeInTheDocument();
  });

  it("renders warnings when present", () => {
    renderWithIntl(
      <ContributionDiffViewer
        diff={{ proposed: {}, current: null, warnings: ["Missing ISBN"] }}
      />,
    );
    expect(screen.getByText("Missing ISBN")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/contribution-diff-viewer.test.tsx`
Expected: FAIL — `Cannot find module './contribution-diff-viewer'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/contribution-diff-viewer.tsx
"use client";

import { useTranslations } from "next-intl";
import type { ContributionDiffResponse } from "@/lib/api/types";

function formatValue(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function diffKeys(
  proposed: Record<string, unknown>,
  current: Record<string, unknown> | null,
): string[] {
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(proposed)]);
  return [...keys].sort((a, b) => a.localeCompare(b));
}

export function ContributionDiffViewer({ diff }: { diff: ContributionDiffResponse }) {
  const t = useTranslations("admin.diffViewer");

  return (
    <div className="flex flex-col gap-3">
      {diff.current === null && (
        <p className="text-muted-foreground text-sm">{t("noCurrent")}</p>
      )}
      {diffKeys(diff.proposed, diff.current).map((key) => (
        <div
          key={key}
          className="border-border flex flex-col gap-1 border-b pb-3 last:border-b-0"
        >
          <span className="font-mono text-sm font-medium">{key}</span>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-destructive line-through">
              {formatValue(diff.current?.[key])}
            </p>
            <p className="text-foreground">{formatValue(diff.proposed[key])}</p>
          </div>
        </div>
      ))}
      {diff.warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t("warningsTitle")}</span>
          <ul className="text-destructive list-inside list-disc text-sm">
            {diff.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/contribution-diff-viewer.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/contribution-diff-viewer.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ContributionDiffViewer } from "./contribution-diff-viewer";

const meta: Meta<typeof ContributionDiffViewer> = {
  title: "Admin/ContributionDiffViewer",
  component: ContributionDiffViewer,
};
export default meta;

type Story = StoryObj<typeof ContributionDiffViewer>;

export const ChangedFields: Story = {
  args: {
    diff: {
      proposed: { title: "New Title", pages: 300 },
      current: { title: "Old Title", pages: 250 },
      warnings: [],
    },
  },
};

export const NewEntity: Story = {
  args: {
    diff: { proposed: { title: "Brand New Book" }, current: null, warnings: ["Missing ISBN"] },
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/contribution-diff-viewer.tsx components/admin/contribution-diff-viewer.stories.tsx components/admin/contribution-diff-viewer.test.tsx
git commit -m "feat(admin): add ContributionDiffViewer component"
```

---

### Task 18: `components/admin/reject-contribution-dialog.tsx`

**Files:**
- Create: `components/admin/reject-contribution-dialog.tsx`
- Create: `components/admin/reject-contribution-dialog.stories.tsx`
- Create: `components/admin/reject-contribution-dialog.test.tsx`

**Interfaces:**
- Consumes: `useRejectContribution` from `hooks/useAdminContributions.ts`
  (Task 8); `Dialog`/`DialogContent`/etc from `components/ui/dialog.tsx`;
  `Textarea` from `components/ui/textarea.tsx`.
- Produces: `RejectContributionDialog` component with props
  `{ contributionId: string; open: boolean; onOpenChange: (open: boolean) => void }` —
  consumed by Task 24. Requires non-empty notes before the confirm button
  is enabled (matches the API's `RejectContributionSchema.notes` required
  field).

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/reject-contribution-dialog.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { RejectContributionDialog } from "./reject-contribution-dialog";
import * as useAdminContributionsHooks from "@/hooks/useAdminContributions";

vi.mock("@/hooks/useAdminContributions");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("RejectContributionDialog", () => {
  beforeEach(() => {
    vi.mocked(useAdminContributionsHooks.useRejectContribution).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as never);
  });

  it("disables the confirm button when notes are empty", () => {
    renderWithIntl(
      <RejectContributionDialog contributionId="c1" open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  });

  it("enables the confirm button once notes are entered and submits them", () => {
    const mutate = vi.fn();
    vi.mocked(useAdminContributionsHooks.useRejectContribution).mockReturnValue({
      mutate,
      isPending: false,
      error: null,
    } as never);

    renderWithIntl(
      <RejectContributionDialog contributionId="c1" open={true} onOpenChange={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Bad data" },
    });
    const confirmButton = screen.getByRole("button", { name: "Reject" });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(mutate).toHaveBeenCalledWith(
      { contributionId: "c1", payload: { notes: "Bad data" } },
      expect.anything(),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/reject-contribution-dialog.test.tsx`
Expected: FAIL — `Cannot find module './reject-contribution-dialog'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/reject-contribution-dialog.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRejectContribution } from "@/hooks/useAdminContributions";
import { extractErrorMessage } from "@/lib/api/errors";

export function RejectContributionDialog({
  contributionId,
  open,
  onOpenChange,
}: {
  contributionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("admin.rejectDialog");
  const [notes, setNotes] = useState("");
  const rejectContribution = useRejectContribution();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reject-notes" className="text-sm font-medium">
            {t("notesLabel")}
          </label>
          <Textarea
            id="reject-notes"
            placeholder={t("notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {rejectContribution.error && (
          <p className="text-destructive text-sm">
            {extractErrorMessage(rejectContribution.error)}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={notes.trim().length === 0 || rejectContribution.isPending}
            onClick={() =>
              rejectContribution.mutate(
                { contributionId, payload: { notes } },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/reject-contribution-dialog.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/reject-contribution-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { RejectContributionDialog } from "./reject-contribution-dialog";

const meta: Meta<typeof RejectContributionDialog> = {
  title: "Admin/RejectContributionDialog",
  component: RejectContributionDialog,
};
export default meta;

type Story = StoryObj<typeof RejectContributionDialog>;

export const Open: Story = {
  args: { contributionId: "c1", open: true, onOpenChange: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/reject-contribution-dialog.tsx components/admin/reject-contribution-dialog.stories.tsx components/admin/reject-contribution-dialog.test.tsx
git commit -m "feat(admin): add RejectContributionDialog component"
```

---

### Task 19: `components/admin/catalog-import-form.tsx`

**Files:**
- Create: `components/admin/catalog-import-form.tsx`
- Create: `components/admin/catalog-import-form.stories.tsx`
- Create: `components/admin/catalog-import-form.test.tsx`

**Interfaces:**
- Consumes: `useStartCatalogImport` from `hooks/useAdminCatalogImports.ts`
  (Task 9); `CatalogImportProfile` from `lib/api/types.ts`;
  `Select`/`SelectTrigger`/`SelectValue`/`SelectContent`/`SelectItem` from
  `components/ui/select.tsx` (same API confirmed in Task 15).
- Produces: `CatalogImportForm` component with props
  `{ onStarted: (jobId: string) => void }` — consumed by Task 25.

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/catalog-import-form.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CatalogImportForm } from "./catalog-import-form";
import * as useAdminCatalogImportsHooks from "@/hooks/useAdminCatalogImports";

vi.mock("@/hooks/useAdminCatalogImports");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("CatalogImportForm", () => {
  beforeEach(() => {
    vi.mocked(useAdminCatalogImportsHooks.useStartCatalogImport).mockReturnValue({
      mutate: vi.fn((_payload, opts) => opts?.onSuccess?.({ job_id: "job1", status: "pending" })),
      isPending: false,
    } as never);
  });

  it("starts an import with the default profile and reports the job id", () => {
    const onStarted = vi.fn();
    renderWithIntl(<CatalogImportForm onStarted={onStarted} />);

    fireEvent.click(screen.getByRole("button", { name: "Start import" }));

    expect(onStarted).toHaveBeenCalledWith("job1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/catalog-import-form.test.tsx`
Expected: FAIL — `Cannot find module './catalog-import-form'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/catalog-import-form.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStartCatalogImport } from "@/hooks/useAdminCatalogImports";
import type { CatalogImportProfile } from "@/lib/api/types";

const PROFILES: CatalogImportProfile[] = ["books", "comics", "manga"];

export function CatalogImportForm({ onStarted }: { onStarted: (jobId: string) => void }) {
  const t = useTranslations("admin.catalogImports");
  const [profile, setProfile] = useState<CatalogImportProfile>("books");
  const startImport = useStartCatalogImport();

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="import-profile" className="text-sm font-medium">
          {t("profileLabel")}
        </label>
        <Select value={profile} onValueChange={(next) => setProfile(next as CatalogImportProfile)}>
          <SelectTrigger id="import-profile">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROFILES.map((p) => (
              <SelectItem key={p} value={p}>
                {t(`profile${p[0].toUpperCase()}${p.slice(1)}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        disabled={startImport.isPending}
        onClick={() =>
          startImport.mutate(
            { profile },
            { onSuccess: (status) => onStarted(status.job_id) },
          )
        }
      >
        {startImport.isPending ? t("starting") : t("start")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/catalog-import-form.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/catalog-import-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { CatalogImportForm } from "./catalog-import-form";

const meta: Meta<typeof CatalogImportForm> = {
  title: "Admin/CatalogImportForm",
  component: CatalogImportForm,
};
export default meta;

type Story = StoryObj<typeof CatalogImportForm>;

export const Default: Story = {
  args: { onStarted: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/catalog-import-form.tsx components/admin/catalog-import-form.stories.tsx components/admin/catalog-import-form.test.tsx
git commit -m "feat(admin): add CatalogImportForm component"
```

---

### Task 20: `components/admin/catalog-import-status.tsx`

**Files:**
- Create: `components/admin/catalog-import-status.tsx`
- Create: `components/admin/catalog-import-status.stories.tsx`
- Create: `components/admin/catalog-import-status.test.tsx`

**Interfaces:**
- Consumes: `CatalogImportJobStatusResponse` from `lib/api/types.ts`.
  Pure display component — the polling itself is the caller's
  responsibility via `useCatalogImportStatus` (Task 9), this component
  just renders whatever status object it's given.
- Produces: `CatalogImportStatus` component with props
  `{ status: CatalogImportJobStatusResponse }` — consumed by Task 25.

- [ ] **Step 1: Write the test file**

```tsx
// components/admin/catalog-import-status.test.tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CatalogImportStatus } from "./catalog-import-status";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("CatalogImportStatus", () => {
  it("renders the job id and status", () => {
    renderWithIntl(
      <CatalogImportStatus status={{ job_id: "job1", status: "pending" }} />,
    );
    expect(screen.getByText("job1")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("renders the result once populated", () => {
    renderWithIntl(
      <CatalogImportStatus
        status={{ job_id: "job1", status: "completed", result: { imported: 5 } }}
      />,
    );
    expect(screen.getByText(/"imported": 5/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/admin/catalog-import-status.test.tsx`
Expected: FAIL — `Cannot find module './catalog-import-status'`

- [ ] **Step 3: Write the implementation**

```tsx
// components/admin/catalog-import-status.tsx
"use client";

import { useTranslations } from "next-intl";
import type { CatalogImportJobStatusResponse } from "@/lib/api/types";

export function CatalogImportStatus({
  status,
}: {
  status: CatalogImportJobStatusResponse;
}) {
  const t = useTranslations("admin.catalogImports");

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        <span className="text-muted-foreground">{t("jobId")}: </span>
        <span className="font-mono">{status.job_id}</span>
      </p>
      <p>
        <span className="text-muted-foreground">{t("statusLabel")}: </span>
        {status.status}
      </p>
      {status.result != null && (
        <div>
          <p className="text-muted-foreground">{t("result")}:</p>
          <pre className="bg-muted rounded-md p-3 text-xs">
            {JSON.stringify(status.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/admin/catalog-import-status.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the Storybook story**

```tsx
// components/admin/catalog-import-status.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { CatalogImportStatus } from "./catalog-import-status";

const meta: Meta<typeof CatalogImportStatus> = {
  title: "Admin/CatalogImportStatus",
  component: CatalogImportStatus,
};
export default meta;

type Story = StoryObj<typeof CatalogImportStatus>;

export const Pending: Story = {
  args: { status: { job_id: "job1", status: "pending" } },
};

export const Completed: Story = {
  args: {
    status: { job_id: "job1", status: "completed", result: { imported: 12 } },
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/admin/catalog-import-status.tsx components/admin/catalog-import-status.stories.tsx components/admin/catalog-import-status.test.tsx
git commit -m "feat(admin): add CatalogImportStatus component"
```

---

### Task 21: `app/(app)/admin/layout.tsx` (REVISED — see Task 10 note)

**Files:**
- Create: `app/(app)/admin/layout.tsx`

**Interfaces:**
- Consumes: `admin.nav.*` i18n keys (Task 11); the same
  `createServerApiClient` (from `lib/api/server-client.ts`) and
  `UserProfileResponse` type that `app/(app)/admin/catalog/layout.tsx`
  already uses for its real is_admin backstop.
- Produces: shared server-side auth check + tab nav wrapping all
  `/admin/*` pages, consumed implicitly by Tasks 22-25 (they render
  inside this layout, no import needed).

**IMPORTANT — this task's design changed from the original plan.**
`proxy.ts` (see the note after Task 9 / struck Task 10) only provides a
fast, non-authoritative edge redirect for `/admin/*`. The **real**
authorization check for `/admin/catalog/*` lives in
`app/(app)/admin/catalog/layout.tsx`, which calls `GET /users/me` with
the live bearer token. `/admin/users`, `/admin/audit-logs`,
`/admin/contributions`, `/admin/catalog-imports` need that same real
backstop — this task's layout must provide it, not just a client-side
tab nav. Read `app/(app)/admin/catalog/layout.tsx` in full (already
quoted below for reference) and reuse its exact pattern.

Since this new layout sits one level above `admin/catalog/`, `/admin/catalog/*`
requests will pass through both this layout's check and the existing
catalog layout's check. That's a harmless redundant `/users/me` call, not
a bug — do not attempt to remove or refactor the existing
`admin/catalog/layout.tsx` check as part of this task; leave it untouched.

Reference — `app/(app)/admin/catalog/layout.tsx` (existing, do not modify):

```tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerApiClient } from "@/lib/api/server-client";
import type { UserProfileResponse } from "@/lib/api/types";

export default async function AdminCatalogLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login?from=/admin/catalog");
  }

  let profile: UserProfileResponse;
  try {
    const client = createServerApiClient(accessToken);
    ({ data: profile } = await client.get<UserProfileResponse>("/users/me"));
  } catch {
    redirect("/login?from=/admin/catalog");
  }

  if (!profile.is_admin) {
    redirect("/");
  }

  return <div className="flex flex-col gap-6">{children}</div>;
}
```

- [ ] **Step 1: Confirm `createServerApiClient`'s exact signature**

Run: `grep -n "export function createServerApiClient" -A5 lib/api/server-client.ts`
Expected: a function taking an optional access token argument (as used
above) — match its exact signature, don't guess.

- [ ] **Step 2: Write `app/(app)/admin/layout.tsx`**, a server component
  combining the same real is_admin check as the reference above with a
  client-side tab nav. Since Next.js layouts are async server components
  by default but the tab nav needs `usePathname()` (client-only), split
  into a server-component layout that renders a small client-component
  nav:

```tsx
// app/(app)/admin/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerApiClient } from "@/lib/api/server-client";
import type { UserProfileResponse } from "@/lib/api/types";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login?from=/admin");
  }

  let profile: UserProfileResponse;
  try {
    const client = createServerApiClient(accessToken);
    ({ data: profile } = await client.get<UserProfileResponse>("/users/me"));
  } catch {
    redirect("/login?from=/admin");
  }

  if (!profile.is_admin) {
    redirect("/");
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminNav />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Write the client-side nav component**

```tsx
// components/admin/admin-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/users", key: "users" },
  { href: "/admin/audit-logs", key: "auditLogs" },
  { href: "/admin/contributions", key: "contributions" },
  { href: "/admin/catalog-imports", key: "catalogImports" },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <div className="border-border flex gap-4 border-b">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 border-transparent px-1 pb-2 text-sm",
              pathname.startsWith(tab.href)
                ? "border-primary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab.key)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Write a Storybook story and test for `AdminNav`**
  (matching this repo's per-component convention — every component in
  `components/admin/` gets a `.stories.tsx` and `.test.tsx`, and this
  layout task introduces one, so it isn't exempt):

```tsx
// components/admin/admin-nav.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AdminNav } from "./admin-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AdminNav", () => {
  it("renders all four tab links", () => {
    renderWithIntl(<AdminNav />);
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit logs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contributions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catalog imports" })).toBeInTheDocument();
  });
});
```

```tsx
// components/admin/admin-nav.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { AdminNav } from "./admin-nav";

const meta: Meta<typeof AdminNav> = {
  title: "Admin/AdminNav",
  component: AdminNav,
};
export default meta;

type Story = StoryObj<typeof AdminNav>;

export const Default: Story = {};
```

- [ ] **Step 5: Run the new test**

Run: `pnpm vitest run components/admin/admin-nav.test.tsx`
Expected: PASS (1 test)

- [ ] **Step 6: Verify the layout builds**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from these files.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/admin/layout.tsx" components/admin/admin-nav.tsx components/admin/admin-nav.test.tsx components/admin/admin-nav.stories.tsx
git commit -m "feat(admin): add admin section layout with real is_admin backstop and tab nav"
```

---

### Task 22: `app/(app)/admin/users/page.tsx`

**Files:**
- Create: `app/(app)/admin/users/page.tsx`

**Interfaces:**
- Consumes: `useAdminUsers` from `hooks/useAdminUsers.ts` (Task 6);
  `UserTable` (Task 12); `PasswordResetDialog` (Task 13);
  `AdminUserListParams` from `lib/api/types.ts`.
- Produces: the `/admin/users` route. Nothing depends on this file.

Follow `app/(app)/contributions/page.tsx`'s simple-pagination convention
(local `skip`/`limit` state, no shadcn `Pagination` component, per the
Global Constraints section) plus basic email/username/status/role filter
inputs above the table, matching `BookSearchFilters`'s controlled-input
shape (already read above) inline in this page rather than as a separate
extracted filters component (the spec doesn't call for one, and the
per-field inputs are simple enough to keep on the page directly — this
avoids an unnecessary Task and matches YAGNI).

- [ ] **Step 1: Write the page**

```tsx
// app/(app)/admin/users/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserTable } from "@/components/admin/user-table";
import { PasswordResetDialog } from "@/components/admin/password-reset-dialog";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import type { AdminUserListParams } from "@/lib/api/types";

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const t = useTranslations("admin.users");
  const [filters, setFilters] = useState<AdminUserListParams>({});
  const [skip, setSkip] = useState(0);
  const [resetUserId, setResetUserId] = useState<string | undefined>();

  const { data, isPending } = useAdminUsers({ ...filters, skip, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-email" className="text-sm font-medium">
            {t("filters.emailLabel")}
          </label>
          <Input
            id="filter-email"
            placeholder={t("filters.emailPlaceholder")}
            value={filters.email ?? ""}
            onChange={(e) => {
              setSkip(0);
              setFilters({ ...filters, email: e.target.value || undefined });
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-username" className="text-sm font-medium">
            {t("filters.usernameLabel")}
          </label>
          <Input
            id="filter-username"
            placeholder={t("filters.usernamePlaceholder")}
            value={filters.username ?? ""}
            onChange={(e) => {
              setSkip(0);
              setFilters({ ...filters, username: e.target.value || undefined });
            }}
          />
        </div>
      </div>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && <UserTable users={data?.items ?? []} onResetPassword={setResetUserId} />}
      {data && data.total > PAGE_SIZE && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={skip + PAGE_SIZE >= data.total}
            onClick={() => setSkip(skip + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
      <PasswordResetDialog
        userId={resetUserId}
        open={resetUserId !== undefined}
        onOpenChange={(open) => !open && setResetUserId(undefined)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/admin/users/page.tsx"
git commit -m "feat(admin): add admin users page"
```

---

### Task 23: `app/(app)/admin/audit-logs/page.tsx`

**Files:**
- Create: `app/(app)/admin/audit-logs/page.tsx`

**Interfaces:**
- Consumes: `useAdminAuditLogs` from `hooks/useAdminAuditLogs.ts` (Task
  7); `AuditLogTable` (Task 14); `AuditLogFilters` (Task 15).
- Produces: the `/admin/audit-logs` route. Nothing depends on this file.

- [ ] **Step 1: Write the page**

```tsx
// app/(app)/admin/audit-logs/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogTable } from "@/components/admin/audit-log-table";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import type { AdminAuditLogListParams } from "@/lib/api/types";

const PAGE_SIZE = 20;

export default function AdminAuditLogsPage() {
  const t = useTranslations("admin.auditLogs");
  const [filters, setFilters] = useState<AdminAuditLogListParams>({});
  const [skip, setSkip] = useState(0);

  const { data, isPending } = useAdminAuditLogs({ ...filters, skip, limit: PAGE_SIZE });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <AuditLogFilters
        value={filters}
        onChange={(next) => {
          setSkip(0);
          setFilters(next);
        }}
      />
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && <AuditLogTable logs={data?.items ?? []} />}
      {data && data.total > PAGE_SIZE && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={skip + PAGE_SIZE >= data.total}
            onClick={() => setSkip(skip + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/admin/audit-logs/page.tsx"
git commit -m "feat(admin): add admin audit logs page"
```

---

### Task 24: `app/(app)/admin/contributions/page.tsx`

**Files:**
- Create: `app/(app)/admin/contributions/page.tsx`

**Interfaces:**
- Consumes: `useAdminContributions`, `useContributionDiff`,
  `useApproveContribution` from `hooks/useAdminContributions.ts` (Task 8);
  `ContributionReviewList` (Task 16); `ContributionDiffViewer` (Task 17);
  `RejectContributionDialog` (Task 18); `ContributionStatus` from
  `lib/api/types.ts`.
- Produces: the `/admin/contributions` route. Nothing depends on this
  file.

This page holds the "selected contribution" state: clicking "View diff"
on a list item opens a `Dialog` showing `ContributionDiffViewer` plus
Approve/Reject buttons. Reject opens `RejectContributionDialog` as a
second, stacked dialog (closing the diff dialog first is fine, or nest —
follow whichever the existing `Dialog` primitive supports based on how
`components/catalog/admin/merge-books-dialog.tsx` or similar nests
confirmation flows, if it does; otherwise close the diff dialog when
opening reject).

- [ ] **Step 1: Write the page**

```tsx
// app/(app)/admin/contributions/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ContributionReviewList } from "@/components/admin/contribution-review-list";
import { ContributionDiffViewer } from "@/components/admin/contribution-diff-viewer";
import { RejectContributionDialog } from "@/components/admin/reject-contribution-dialog";
import {
  useAdminContributions,
  useApproveContribution,
  useContributionDiff,
} from "@/hooks/useAdminContributions";
import type { ContributionStatus } from "@/lib/api/types";

const STATUSES: ContributionStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "merged",
];

export default function AdminContributionsPage() {
  const t = useTranslations("admin.contributions");
  const [status, setStatus] = useState<ContributionStatus>("submitted");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [rejectingId, setRejectingId] = useState<string | undefined>();

  const { data, isPending } = useAdminContributions({ status, limit: 20 });
  const diff = useContributionDiff(selectedId);
  const approve = useApproveContribution();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <div className="flex flex-col gap-1.5 sm:w-64">
        <label htmlFor="status-filter" className="text-sm font-medium">
          {t("statusFilterLabel")}
        </label>
        <Select value={status} onValueChange={(next) => setStatus(next as ContributionStatus)}>
          <SelectTrigger id="status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && (
        <ContributionReviewList
          contributions={data?.items ?? []}
          onSelect={setSelectedId}
        />
      )}

      <Dialog
        open={selectedId !== undefined}
        onOpenChange={(open) => !open && setSelectedId(undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("viewDiff")}</DialogTitle>
          </DialogHeader>
          {diff.data && <ContributionDiffViewer diff={diff.data} />}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingId(selectedId);
                setSelectedId(undefined);
              }}
            >
              {t("reject")}
            </Button>
            <Button
              disabled={approve.isPending}
              onClick={() =>
                selectedId &&
                approve.mutate(selectedId, { onSuccess: () => setSelectedId(undefined) })
              }
            >
              {t("approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rejectingId && (
        <RejectContributionDialog
          contributionId={rejectingId}
          open={rejectingId !== undefined}
          onOpenChange={(open) => !open && setRejectingId(undefined)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/admin/contributions/page.tsx"
git commit -m "feat(admin): add admin contributions moderation page"
```

---

### Task 25: `app/(app)/admin/catalog-imports/page.tsx`

**Files:**
- Create: `app/(app)/admin/catalog-imports/page.tsx`

**Interfaces:**
- Consumes: `useCatalogImportStatus` from
  `hooks/useAdminCatalogImports.ts` (Task 9); `CatalogImportForm` (Task
  19); `CatalogImportStatus` (Task 20).
- Produces: the `/admin/catalog-imports` route. Nothing depends on this
  file.

- [ ] **Step 1: Write the page**

```tsx
// app/(app)/admin/catalog-imports/page.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CatalogImportForm } from "@/components/admin/catalog-import-form";
import { CatalogImportStatus } from "@/components/admin/catalog-import-status";
import { useCatalogImportStatus } from "@/hooks/useAdminCatalogImports";

export default function AdminCatalogImportsPage() {
  const t = useTranslations("admin.catalogImports");
  const [jobId, setJobId] = useState<string | undefined>();
  const { data } = useCatalogImportStatus(jobId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <CatalogImportForm onStarted={setJobId} />
      {data && <CatalogImportStatus status={data} />}
    </div>
  );
}
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/admin/catalog-imports/page.tsx"
git commit -m "feat(admin): add admin catalog imports page"
```

---

### Task 26: Header admin nav link

**Files:**
- Modify: `components/shell/header.tsx`
- Modify: `components/shell/header.test.tsx`
- Modify: `components/shell/header.stories.tsx`

**Interfaces:**
- Consumes: `me?.is_admin` (already available from `useMe()`, already
  called in this file).
- Produces: nothing new for other tasks — this is the final integration
  point making `/admin` reachable from the UI.

- [ ] **Step 1: Read the current test file to match its exact assertions style**

Run: `cat components/shell/header.test.tsx`

- [ ] **Step 2: Add a link in the nav, gated on `me?.is_admin`**

In `components/shell/header.tsx`, inside the `<nav>` block (right after
the existing Chat `<Link>`), add:

```tsx
        {me?.is_admin && (
          <Link href="/admin/users" className="text-muted-foreground hover:text-foreground text-sm">
            {tShell("nav.admin")}
          </Link>
        )}
```

- [ ] **Step 3: Add `"admin": "Admin"` to `shell.nav` in both locale files**

In `messages/en.json`, inside the existing `"shell": { "nav": { ... } }`
block, add `"admin": "Admin"` after the `"chat"` key.

In `messages/uk.json`, inside the same block, add `"admin": "Адміністрування"`.

- [ ] **Step 4: Add test cases to `components/shell/header.test.tsx`**

Add these two test cases (adapt to the file's existing mock/wrapper setup
after reading it in Step 1 — the shape below assumes it already mocks
`useMe` the same way `header.stories.tsx:60` does with `is_admin: false`):

```tsx
  it("does not show the Admin link for a non-admin user", () => {
    // uses the file's existing non-admin mock setup
    renderHeader();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows the Admin link for an admin user", () => {
    // override the file's existing mock to set is_admin: true, matching
    // however this file already overrides useMe's return value per-test
    renderHeader({ isAdmin: true });
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
```

Adjust `renderHeader(...)` to whatever helper/pattern the existing file
actually uses (read Step 1's output before writing this — don't invent a
new helper name if one already exists).

- [ ] **Step 5: Run the test file**

Run: `pnpm vitest run components/shell/header.test.tsx`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 6: Update `components/shell/header.stories.tsx` with an admin variant**

Add a new exported story (following the file's existing story export
pattern) with `is_admin: true` in its mocked `useMe` data, named
`AdminUser` or similar or whatever this file's naming convention for
story variants is (read the file first).

- [ ] **Step 7: Commit**

```bash
git add components/shell/header.tsx components/shell/header.test.tsx components/shell/header.stories.tsx messages/en.json messages/uk.json
git commit -m "feat(admin): add Admin nav link to header for admin users"
```

---

### Task 27: e2e admin happy-path test

**Files:**
- Create: `e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `test`, `expect` from `./fixtures` (existing pattern).

There is no way to create or promote the *first* admin user through this
UI or the documented API surface (promoting requires an existing admin —
confirmed: no bootstrap/seed endpoint exists in the live OpenAPI schema).
This test therefore needs a pre-existing admin fixture account, supplied
via environment variables, and must skip gracefully if that fixture isn't
configured — matching how this repo already keeps e2e specs runnable
without special setup by default.

- [ ] **Step 1: Write the test**

```ts
// e2e/admin.spec.ts
import { test, expect } from "./fixtures";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(
  !ADMIN_EMAIL || !ADMIN_PASSWORD,
  "requires E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD env vars for a pre-seeded admin account " +
    "(no API endpoint exists to create the first admin from the UI)",
);

test("admin promotes a user and reviews a contribution", async ({ browser }) => {
  const suffix = Date.now();
  const targetUser = {
    email: `e2e-admin-target-${suffix}@example.com`,
    username: `e2eadmintarget${suffix}`,
    password: "password123",
  };

  const targetContext = await browser.newContext();
  const targetPage = await targetContext.newPage();
  await targetPage.goto("/register");
  await targetPage.getByLabel("Email").fill(targetUser.email);
  await targetPage.getByLabel("Username").fill(targetUser.username);
  await targetPage.getByLabel("Display name").fill("E2E Admin Target");
  await targetPage.getByLabel("Password").fill(targetUser.password);
  await targetPage.getByRole("button", { name: "Create account" }).click();
  await expect(targetPage).toHaveURL(/\/profile/);
  await targetContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/login");
  await adminPage.getByLabel("Email").fill(ADMIN_EMAIL as string);
  await adminPage.getByLabel("Password").fill(ADMIN_PASSWORD as string);
  await adminPage.getByRole("button", { name: "Sign in" }).click();
  await expect(adminPage).toHaveURL(/\/profile/);

  await adminPage.getByRole("link", { name: "Admin" }).click();
  await expect(adminPage).toHaveURL(/\/admin\/users/);

  await adminPage.getByLabel("Username").fill(targetUser.username);
  await expect(adminPage.getByText(targetUser.email)).toBeVisible();

  await adminPage.getByRole("button", { name: "Actions" }).click();
  await adminPage.getByText("Promote to admin").click();
  await expect(adminPage.getByText("Admin", { exact: true })).toBeVisible();

  await adminContext.close();
});
```

- [ ] **Step 2: Run it (only meaningful with fixture env vars set)**

Run: `pnpm exec playwright test e2e/admin.spec.ts`
Expected: `1 skipped` if `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` are unset
(this is the expected default CI/local state — no admin bootstrap exists
yet). If a maintainer has seeded an admin account and set those env vars,
expect `1 passed`.

- [ ] **Step 3: Commit**

```bash
git add e2e/admin.spec.ts
git commit -m "test(admin): add e2e admin happy-path test (skips without seeded admin fixture)"
```

---

## Post-Implementation Gate

After all 27 tasks are reviewed and committed, run the full project gate
before considering Block 7 done:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm vitest run
pnpm build
pnpm exec prettier --check .
```

Any failure here spawns a fix subtask re-entering tier selection — a
failing test the original task's subagent should have caught is itself a
signal to escalate that specific area (e.g. if Task 21's layout doesn't
match Task 26's header nav conventions, that's a Sonnet-level integration
fix, not a Haiku retry).

## Spec Coverage Check

- Users (list/filter/activate/deactivate/promote/demote/password-reset):
  Tasks 1, 2, 6, 12, 13, 22 ✓
- Audit logs (list/filter, read-only): Tasks 1, 3, 7, 14, 15, 23 ✓
- Contributions (list/claim/diff/approve/reject): Tasks 1, 4, 8, 16, 17,
  18, 24 ✓
- Catalog imports (trigger/poll): Tasks 1, 5, 9, 19, 20, 25 ✓
- Admin gating: already existed pre-plan as `proxy.ts` + `admin/catalog/layout.tsx`
  backstop (Task 10 struck); extended to the rest of `/admin/*` by
  Task 21's revised layout ✓
- Header nav integration: Task 26 ✓
- i18n (en + uk): Task 11 (+ Task 26 for the nav string) ✓
- e2e coverage: Task 27 (documented limitation: needs a seeded admin
  fixture, since no bootstrap path exists) ✓
