# Block 2 — Catalog: Design

## Purpose

Deliver the Catalog block per `docs/specs/2026-07-13-ui-repo-design.md`'s block table: `books`, `releases`, `contributors`, `external` routers. Covers public search/browse/detail, full admin catalog management, version history/diff viewing, and introduces i18n infra (next-intl, en/uk) used going forward by all blocks.

## Scope

**In scope:**
- Public book search/browse (filters: title, author, language), book detail (releases, contributors, reviews list), contributor detail, external source search (public read).
- Admin catalog management: create/edit book, create/edit release, create/edit contributor, merge books, attach/detach contributor to book or release, import book from external source.
- Version history + diff viewer for books, releases, contributors (admin-only screens).
- **Non-admin "Suggest an edit" flow via the `contributions` router** (added after discovering a prior, independently-produced Block 2 spec on `main` dated 2026-07-18, verified against the live API — see Addendum below): authenticated non-admin users can propose a new book/release/contributor or an edit to an existing one; the proposal is created as a `draft` contribution and immediately submitted, surfacing in a minimal "My Submissions" read-only list. Approval/rejection review UI is explicitly Block 7's job, not this block's.
- next-intl setup (English default + Ukrainian), all new Block 2 UI strings translated, visible locale switcher in app shell header.
- Migrate existing Block 1 hardcoded strings (login, register, verify, profile pages) to next-intl as part of this setup.

**Out of scope / deferred:**
- Review creation/editing (belongs to Block 3 — Collections & Reviews). Block 2 only *displays* existing reviews via the nested `GET /books/{id}/reviews` / `GET /releases/{id}/reviews` endpoints.
- JWT-claim-based edge middleware admin gating — blocked on API-side change ([bookworm-hole-api#144](https://github.com/fedorkovolodymyr/bookworm-hole-api/issues/144), not merge-blocking). Interim: server-side `/users/me` check.
- Contribution moderation (approve/reject queue, `admin_contributions` router) — Block 7.

## Addendum: Reconciliation with prior Block 2 spec (2026-07-18, commit 98e069d)

An earlier session had already written a Block 2 spec verified against the *live* API (this session's initial research read source only). That spec correctly identified that every mutating endpoint on `books`/`releases`/`contributors` carries `dependencies=[Depends(require_admin)]` — confirmed here by re-grepping `app/routers/{books,releases,contributors}.py` directly. It concluded Block 2 should be read-only browse + a `contributions`-based "suggest an edit" flow, deferring all direct admin CRUD UI to Block 7.

This session's spec (the one this document is) took a different scope decision, explicitly chosen by the user after being shown the admin-gating tradeoff: build real admin CRUD screens in Block 2 itself, gated behind `/admin/catalog` and a genuine `is_admin` check — which is consistent with `require_admin`, just answers "who builds the admin UI" differently than the prior spec did (Block 2 now, not deferred to Block 7).

What the prior spec caught that this one had missed entirely: the `contributions` router (`POST /contributions/`, `GET /contributions/me/contributions`, `PATCH/DELETE /contributions/{id}`, `POST /contributions/{id}/submit`) is the *only* write path available to non-admin users, and had no coverage in this spec. That gap is real regardless of which spec "governs" the admin-UI question, since the router exists in the live API either way. Resolution: **this spec governs the admin-CRUD scope decision; the contributions flow is added on top, not swapped in.** Both admin CRUD and the non-admin suggest-an-edit flow ship in this block.

### `contributions` router reference (verified against `app/routers/contributions.py`, `app/schemas/contribution_schemas.py`, `app/models/contribution.py`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/contributions/` | any authenticated user (`get_current_user`, no admin check) | Body `CreateContributionSchema{kind, target_id?, payload}` → `ContributionResponse` (201) |
| GET | `/contributions/me/contributions` | authenticated | `Page<ContributionResponse>`, query `skip`/`limit` |
| GET | `/contributions/{id}` | authenticated (own) | `ContributionResponse`; 404 |
| PATCH | `/contributions/{id}` | authenticated (own) | Body `UpdateContributionSchema{payload}` → `ContributionResponse`; 404, 409 |
| POST | `/contributions/{id}/submit` | authenticated (own) | `ContributionResponse` (draft → submitted); 404, 409 |
| DELETE | `/contributions/{id}` | authenticated (own) | 204; 404, 409 |

```ts
type ContributionKind = "new_book" | "new_release" | "new_contributor" | "edit_book" | "edit_release" | "edit_contributor";
type ContributionStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "merged";

interface CreateContributionPayload { kind: ContributionKind; target_id?: string | null; payload: Record<string, unknown> }
interface UpdateContributionPayload { payload: Record<string, unknown> }
interface ContributionResponse {
  id: string; user_id: string; kind: ContributionKind; target_id: string | null;
  payload: Record<string, unknown>; status: ContributionStatus;
  reviewer_id: string | null; review_notes: string | null;
  created_at: string; updated_at: string;
}
```

**UI surface added:** a shared `SuggestEditDialog` component (kind-aware form, builds the `payload` object matching the relevant `Create*Schema`/`Update*Schema` shape for the target entity type), triggered from book detail, contributor detail, and external-search-hit cards for signed-in non-admin users (redirect to `/login` if unauthenticated). Submit composes `POST /contributions/` then `POST /contributions/{id}/submit` in one action (draft→submitted immediately; editing a still-draft contribution before submit is out of scope). A minimal read-only "My Submissions" list (`GET /contributions/me/contributions`) is linked from the profile menu.

## API Reference (bookworm-hole-api, base `/api/v1`)

Full endpoint/schema detail gathered from the sibling repo — see "Endpoint Reference" section below. Key facts that affect client design:

- Error shape is uniform: `{ detail: string }` across `AppError` subclasses and plain `HTTPException`.
- Pagination: `Page<T> { items, total, limit, offset }`, query params `skip`/`limit`.
- `POST /books/{id}/contributors` and `POST /releases/{id}/contributors` return **HTTP 200** for both "created" and "already_existed" cases (body differs: `{status: "created"|"already_existed"}`) — do not branch UI logic on status code here, branch on body.
- `POST /external/import` response (`BookWithReleasesResponse`) does **not** compute `average_rating`/`rating_count` — they come back as Pydantic defaults (`null`/`0`), unlike `GET /books/{id}` which computes real aggregates. Surface this only where it'd visibly confuse (e.g. immediately after import, briefly show "not yet rated" rather than a fake `0`-star display).
- `releases` router has no list-all endpoint — releases are only reachable via a book's nested `releases[]` or by direct `release_id`.
- Admin routes require `is_admin` server-side (403 `"Admin privileges required"` if not); none of the four routers gate *reads* behind auth.

## Architecture

### API client layer (`lib/api/`)

Public (GET-only, no admin required) and admin (mutating, `is_admin`-gated server-side) calls are split into separate files per domain, so an accidental import of a mutating call into a public page is a visible path smell:

```
lib/api/
  books.ts             # GET list, by-isbn, detail, reviews, history, history/{version}
  books-admin.ts        # POST create, PATCH update, DELETE, POST merge-into, POST/DELETE contributors
  releases.ts           # GET detail, reviews, history, history/{version}
  releases-admin.ts      # POST create, PATCH update, POST/DELETE contributors
  contributors.ts        # GET list, detail, books, history, history/{version}
  contributors-admin.ts  # POST create, PATCH update
  external.ts            # GET search (public), POST import (admin — kept here since it's the only external mutation; file stays small)
  types.ts              # extend with Book/Release/Contributor/ISBN/EntityVersion/ExternalSearch types (verbatim field names/types per API reference)
```

### Hooks (`hooks/`)

TanStack Query, one file per domain, queries + mutations:

```
useBooks.ts (list/search), useBook.ts (detail), useBookReviews.ts, useBookHistory.ts, useBookVersion.ts
useReleases.ts (detail), useReleaseReviews.ts, useReleaseHistory.ts, useReleaseVersion.ts
useContributors.ts (list), useContributor.ts (detail), useContributorBooks.ts, useContributorHistory.ts, useContributorVersion.ts
useExternalSearch.ts, useImportBook.ts

Admin mutations (co-located per domain, suffixed, or in a matching *-admin hook file):
useCreateBook.ts, useUpdateBook.ts, useDeleteBook.ts, useMergeBooks.ts, useAttachBookContributor.ts, useDetachBookContributor.ts
useCreateRelease.ts, useUpdateRelease.ts, useAttachReleaseContributor.ts, useDetachReleaseContributor.ts
useCreateContributor.ts, useUpdateContributor.ts
```

All mutations invalidate the relevant query keys on success (e.g. creating a release invalidates the parent book's detail query).

### Components (`components/catalog/`)

```
BookCard, BookSearchFilters, BookDetail, ReleaseCard, ReleaseList, ReviewList (display-only), ContributorCard, ContributorDetail
admin/
  BookForm, ReleaseForm, ContributorForm
  MergeBooksDialog, AttachContributorDialog, DetachContributorDialog, ImportBookDialog
history/
  VersionList, VersionDiffViewer   # shared across book/release/contributor — takes entity_type as prop
```

Every component ships a Storybook story (variants: default, loading/skeleton, error, empty).

### Pages (`app/(app)/`)

```
books/page.tsx                       # search/browse, filters, pagination
books/[id]/page.tsx                   # detail: releases, contributors, reviews list
contributors/[id]/page.tsx             # detail: books/releases by role
external/page.tsx                      # search UI; import action visible only to admins

admin/catalog/
  layout.tsx                          # server component: fetchProfile() -> redirect non-admins to "/"
  books/page.tsx                       # list + create
  books/[id]/edit/page.tsx
  books/[id]/history/page.tsx           # VersionList + VersionDiffViewer
  releases/[id]/edit/page.tsx
  releases/[id]/history/page.tsx
  contributors/page.tsx                 # list + create
  contributors/[id]/edit/page.tsx
  contributors/[id]/history/page.tsx
```

### Admin boundary (defense in depth)

1. **Route structure:** all admin catalog screens live under `/admin/catalog/**`, a distinct route group from public catalog pages.
2. **Edge (`proxy.ts`):** add `/admin` to `PROTECTED_PATHS` — presence-only token check (existing pattern from `/profile`), redirects to `/login` if no token.
3. **Server layout guard:** `app/(app)/admin/catalog/layout.tsx` is a server component calling `fetchProfile()` (`/users/me`); redirects to `/` if `!is_admin`. This is the real admin gate given the JWT has no embedded claim yet.
4. **API layer:** admin-only calls isolated in `*-admin.ts` files, never imported from non-admin pages/components.
5. **API itself** rejects non-admin mutation attempts with 403 regardless of UI state — UI errors surface this inline if somehow reached.

Follow-up (not this block): once [bookworm-hole-api#144](https://github.com/fedorkovolodymyr/bookworm-hole-api/issues/144) lands (`is_admin` embedded in JWT), swap step 3 for a fast edge-middleware claim decode.

### Version history / diff viewer

`VersionList` renders `Page<EntityVersionResponse>` (paginated, `changed_by_user_id`, `change_source`, `created_at`, `version_number`). Selecting two versions (or a version vs. current) opens `VersionDiffViewer`, which fetches `EntityVersionDetailResponse` (includes `snapshot: dict`) for each side and renders a field-by-field diff (added/changed/removed keys, simple key-value comparison — no rich text diffing needed since snapshots are flat-ish entity dicts).

### i18n (next-intl)

- Install `next-intl`, configure `i18n/request.ts` + `next.config` per next-intl App Router setup.
- `messages/en.json`, `messages/uk.json` — namespaced by domain (`catalog.books.*`, `catalog.admin.*`, `auth.login.*`, etc).
- `components/shell/LocaleSwitcher.tsx` added to existing app shell header; locale persisted via cookie, default `en`.
- All new Block 2 strings routed through `useTranslations()`.
- Migrate existing Block 1 hardcoded strings (login, register, verify, profile pages/components) into the same message files — avoids a mixed hardcoded/translated codebase.

## Data Flow & Error Handling

Unchanged from repo-wide pattern (`docs/specs/2026-07-13-ui-repo-design.md`): axios + `withCredentials`, one silent refresh on 401 via BFF route, domain errors surface through TanStack Query `error` state as inline component states. Admin mutation 403s render inline (not a crash boundary) — expected only if UI guard is somehow bypassed.

## Testing

- Vitest + RTL: every component (Storybook-covered) gets render/interaction tests; every hook gets a test against a mocked API (msw) covering success + error branches, including the `POST .../contributors` 200-with-body-status-field quirk.
- Playwright: one happy path — search books → open detail → view releases/reviews. A second (admin) happy path — log in as admin, create a book, edit it, view its history — if time allows within this block; otherwise defer to a follow-up without blocking the main PR.
- next-intl: smoke test that both locales render without missing-key errors for at least one page.

## Constraints / Follow-ups

- **Not blocking:** [bookworm-hole-api#144](https://github.com/fedorkovolodymyr/bookworm-hole-api/issues/144) — `is_admin` JWT claim for edge middleware. Interim server-side check is sufficient for this block; revisit middleware once closed.
- Single combined plan/PR for this block (public catalog + admin + history + i18n), per explicit decision — not split into 2a/2b.

---

## Endpoint Reference (verbatim from bookworm-hole-api)

### Global error shape
All domain errors: `{ "detail": "<message>" }`. `AppError` subclasses: `NotFoundError` (404), `ConflictError` (409), `UnauthorizedError` (401), `ExternalServiceError` (502), `BadRequestError` (400), `ServiceUnavailableError` (503). Plain `HTTPException` used in a few older paths — same JSON shape.

### Pagination
`Page<T> { items: T[], total: number, limit: number, offset: number }`. Query params `skip`, `limit`. Enforced bounds (`ge=0`, `1<=limit<=100`) only on the `books` router; `releases`/`contributors` accept unbounded ints.

### `books` router (`/api/v1/books`)

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/` | public | 200 | `Page<BookResponse>`. Query: `skip`, `limit`, `title` (ILIKE), `author` (ILIKE on contributor name), `language` (exact, joined release) |
| POST | `/` | admin | 201 | Body `CreateBookSchema` → `BookResponse` |
| GET | `/by-isbn/{isbn}` | public | 200 | `BookWithReleasesResponse`; 404 if not found |
| GET | `/{book_id}` | public | 200 | `BookWithReleasesResponse` incl. computed `average_rating`/`rating_count`; 404 |
| PATCH | `/{book_id}` | admin | 200 | Body `UpdateBookSchema` (all optional) → `BookResponse`; 404 |
| DELETE | `/{book_id}` | admin | 204 | 404 |
| POST | `/{source_id}/merge-into/{target_id}` | admin | 200 | `BookWithReleasesResponse`; 409 if source==target, 404 if either missing |
| POST | `/{book_id}/contributors` | admin | 200 (always) | Body `AddContributorSchema{contributor_id, role}` → `{status: "created"\|"already_existed"}`; 404 |
| DELETE | `/{book_id}/contributors/{contributor_id}` | admin | 204 | Query `role` required; 404 variants |
| GET | `/{book_id}/reviews` | public | 200 | `Page<ReviewResponse>`; query `sort` (`created_at`\|`rating`), `skip`, `limit` |
| GET | `/{book_id}/history` | public | 200 | `Page<EntityVersionResponse>` |
| GET | `/{book_id}/history/{version}` | public | 200 | `EntityVersionDetailResponse`; 404 |

### `releases` router (`/api/v1/releases`) — no list-all endpoint

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/{release_id}` | public | 200 | `ReleaseWithISBNsResponse` incl. computed rating fields; 404 |
| POST | `/` | admin | 201 | Body `CreateReleaseSchema` → `ReleaseWithISBNsResponse`; 404 if `book_id` invalid |
| PATCH | `/{release_id}` | admin | 200 | Body `UpdateReleaseSchema`; 404 |
| POST | `/{release_id}/contributors` | admin | 200 (always) | Same pattern as books; 404 |
| DELETE | `/{release_id}/contributors/{contributor_id}` | admin | 204 | Query `role` required; 404 variants |
| GET | `/{release_id}/reviews` | public | 200 | `Page<ReviewResponse>` |
| GET | `/{release_id}/history` | public | 200 | `Page<EntityVersionResponse>` |
| GET | `/{release_id}/history/{version}` | public | 200 | `EntityVersionDetailResponse`; 404 |

### `contributors` router (`/api/v1/contributors`)

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/` | public | 200 | `Page<ContributorResponse>`. Query: `skip`, `limit`, `name` (ILIKE full_name OR sort_name), `role` |
| POST | `/` | admin | 201 | Body `CreateContributorSchema` → `ContributorResponse` |
| GET | `/{contributor_id}` | public | 200 | `ContributorDetailResponse` (books_by_role, releases_by_role maps); 404 |
| PATCH | `/{contributor_id}` | admin | 200 | Body `UpdateContributorSchema`; 404 |
| GET | `/{contributor_id}/books` | public | 200 | `Page<BookResponse>`; 404 |
| GET | `/{contributor_id}/history` | public | 200 | `Page<EntityVersionResponse>` |
| GET | `/{contributor_id}/history/{version}` | public | 200 | `EntityVersionDetailResponse`; 404 |

### `external` router (`/api/v1/external`)

| Method | Path | Auth | Status | Notes |
|---|---|---|---|---|
| GET | `/search` | public | 200 (always) | Query `q` (required), `sources` (CSV, optional — omit for all adapters). `ExternalSearchResponse{query, hits[], partial_failures{}}`. Per-source failures captured in `partial_failures`, not raised. |
| POST | `/import` | admin | 200 | Body `ImportBookRequest{source, source_id}` → `BookWithReleasesResponse` **(rating fields not computed — see quirk above)**. 404 unknown adapter/source book; 502 possible from adapter internals |

### Schemas (verbatim)

```ts
// books
interface CreateBookSchema { title: string; original_title?: string|null; original_language?: string|null; first_publication_year?: number|null; description: string }
interface UpdateBookSchema { title?: string|null; original_title?: string|null; original_language?: string|null; first_publication_year?: number|null; description?: string|null }
interface BookResponse { id: string; title: string; original_title: string|null; original_language: string|null; first_publication_year: number|null; description: string; created_at: string; updated_at: string }
interface ISBNResponse { id: string; code_normalized: string; code_original: string; kind: "isbn10"|"isbn13"|"asin"|"other" }
interface ReleaseWithISBNsResponse { id: string; format: ReleaseFormat; publisher: string; published_year: number|null; language: string; page_count: number|null; duration_minutes: number|null; cover_image_url: string|null; description_override: string|null; isbns: ISBNResponse[]; average_rating: number|null; rating_count: number }
interface BookWithReleasesResponse extends BookResponse { releases: ReleaseWithISBNsResponse[]; average_rating: number|null; rating_count: number }
interface CreateReleaseSchema { book_id: string; format: ReleaseFormat; publisher: string; published_year?: number|null; language: string; page_count?: number|null; duration_minutes?: number|null; cover_image_url?: string|null; description_override?: string|null }
interface UpdateReleaseSchema { format?: ReleaseFormat; publisher?: string; published_year?: number|null; language?: string; page_count?: number|null; duration_minutes?: number|null; cover_image_url?: string|null; description_override?: string|null }
interface ImportBookRequest { source: string; source_id: string }

// contributors
interface CreateContributorSchema { full_name: string; sort_name: string; birth_year?: number|null; death_year?: number|null; bio?: string|null }
interface UpdateContributorSchema { full_name?: string; sort_name?: string; birth_year?: number|null; death_year?: number|null; bio?: string|null }
interface ContributorResponse { id: string; full_name: string; sort_name: string; birth_year: number|null; death_year: number|null; bio: string|null; slug: string; created_at: string; updated_at: string }
interface ContributorBookSummary { id: string; title: string }
interface ContributorReleaseSummary { id: string; format: ReleaseFormat; publisher: string; language: string }
interface ContributorDetailResponse extends ContributorResponse { books_by_role: Record<ContributorRole, ContributorBookSummary[]>; releases_by_role: Record<ContributorRole, ContributorReleaseSummary[]> }
interface AddContributorSchema { contributor_id: string; role: ContributorRole }

// external
interface ExternalSearchHit { source: string; title: string; isbns: string[]; authors: string[]; cover_image_url: string|null }
interface ExternalSearchResponse { query: string; hits: ExternalSearchHit[]; partial_failures: Record<string,string> }

// version history
interface EntityVersionResponse { id: string; entity_type: "book"|"release"|"contributor"; entity_id: string; version_number: number; changed_by_user_id: string|null; change_source: "admin"|"contribution"|"external_sync"|"system"; contribution_id: string|null; created_at: string }
interface EntityVersionDetailResponse extends EntityVersionResponse { snapshot: Record<string, unknown> }

// reviews (display-only in this block)
interface ReviewResponse { id: string; user_id: string|null; book_id: string|null; release_id: string|null; rating: number|null; title: string|null; body: string|null; is_public: boolean; contains_spoilers: boolean; created_at: string; updated_at: string }

// enums
type ContributorRole = "author"|"co_author"|"translator"|"illustrator"|"editor"|"narrator"|"foreword"|"other"
type ReleaseFormat = "hardcover"|"paperback"|"ebook"|"audiobook"|"other"
type ReviewSort = "created_at"|"rating"
```
