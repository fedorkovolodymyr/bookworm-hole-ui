# Block 2 (Catalog) — Design

## Purpose

Second domain block. Covers the `books`, `releases`, `contributors`, and
`external` API routers: book search/browse, book detail (with releases,
contributors, reviews summary), contributor detail (bibliography), and an
external-source lookup UI (search Open Library-style sources, preview a hit).
Establishes the read-heavy catalog browsing surface plus a "propose an edit"
flow that writes through the `contributions` moderation queue rather than
directly to catalog tables — see **Real API surface** below for why.

## Real API surface (verified against running OpenAPI schema and `app/routers/*.py` source)

| Endpoint | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/v1/books/` | GET | none | query: `skip=0, limit(1-100)=10, title?, author?, language?` | `Page[BookResponse] {items: BookResponse[], total, limit, offset}` |
| `/api/v1/books/` | POST | **admin** (`require_admin`) | `CreateBookSchema {title, original_title?, original_language?, first_publication_year?, description}` | `BookResponse` (201) |
| `/api/v1/books/by-isbn/{isbn}` | GET | none | — | `BookWithReleasesResponse` (404 `"Book not found"` if no match) |
| `/api/v1/books/{book_id}` | GET | none | — | `BookWithReleasesResponse {..., releases: ReleaseWithISBNsResponse[], average_rating, rating_count}` |
| `/api/v1/books/{book_id}` | PATCH | **admin** | `UpdateBookSchema` (all fields optional) | `BookResponse` |
| `/api/v1/books/{book_id}` | DELETE | **admin** | — | 204 |
| `/api/v1/books/{book_id}/contributors` | POST | **admin** | `AddContributorSchema {contributor_id, role: ContributorRole}` | `{status: "created"\|"already_existed"}` (200) |
| `/api/v1/books/{book_id}/contributors/{contributor_id}` | DELETE | **admin** | query: `role` (required) | 204 |
| `/api/v1/books/{book_id}/history` | GET | none | query: `skip, limit` | `Page[EntityVersionResponse]` |
| `/api/v1/books/{book_id}/history/{version}` | GET | none | — | `EntityVersionDetailResponse` (404 if version doesn't exist) |
| `/api/v1/books/{book_id}/reviews` | GET | none | query: `sort=created_at\|rating, skip, limit` | `Page[ReviewResponse]` (full review CRUD is Block 3; this is read-only for book detail) |
| `/api/v1/books/{source_id}/merge-into/{target_id}` | POST | **admin** | — | `BookWithReleasesResponse` — reassigns releases/reviews/statuses/collection items from source to target, deletes source, atomic. **Admin/moderation tooling — out of scope for Block 2, belongs in Block 7.** |
| `/api/v1/releases/` | POST | **admin** | `CreateReleaseSchema {book_id, format: ReleaseFormat, publisher, published_year?, language, page_count?, duration_minutes?, cover_image_url?, description_override?}` | `ReleaseWithISBNsResponse` |
| `/api/v1/releases/{release_id}` | GET | none | — | `ReleaseWithISBNsResponse {..., isbns: ISBNResponse[], average_rating, rating_count}` |
| `/api/v1/releases/{release_id}` | PATCH | **admin** | `UpdateReleaseSchema` (all optional) | `ReleaseWithISBNsResponse` |
| `/api/v1/releases/{release_id}/contributors` | POST | **admin** | `AddContributorSchema` | `{status: ...}` |
| `/api/v1/releases/{release_id}/contributors/{contributor_id}` | DELETE | **admin** | query: `role` | 204 |
| `/api/v1/releases/{release_id}/history` | GET | none | query: `skip, limit` | `Page[EntityVersionResponse]` |
| `/api/v1/releases/{release_id}/history/{version}` | GET | none | — | `EntityVersionDetailResponse` |
| `/api/v1/releases/{release_id}/reviews` | GET | none | query: `sort, skip, limit` | `Page[ReviewResponse]` |
| `/api/v1/contributors/` | GET | none | query: `skip, limit, name?, role?: ContributorRole` | `Page[ContributorResponse]` |
| `/api/v1/contributors/` | POST | **admin** | `CreateContributorSchema {full_name, sort_name, birth_year?, death_year?, bio?}` | `ContributorResponse` |
| `/api/v1/contributors/{contributor_id}` | GET | none | — | `ContributorResponse {id, full_name, sort_name, birth_year, death_year, bio, slug, created_at, updated_at}` — note: NOT the detail shape (see bug below) |
| `/api/v1/contributors/{contributor_id}` | PATCH | **admin** | `UpdateContributorSchema` (all optional) | `ContributorResponse` |
| `/api/v1/contributors/{contributor_id}/books` | GET | none | query: `skip, limit` | `Page[ContributorBookSummary]`? — see note below (not independently verified against `ContributorDetailResponse.books_by_role`) |
| `/api/v1/contributors/{contributor_id}/history` | GET | none | query: `skip, limit` | `Page[EntityVersionResponse]` |
| `/api/v1/contributors/{contributor_id}/history/{version}` | GET | none | — | `EntityVersionDetailResponse` |
| `/api/v1/external/import` | POST | **admin** | `ImportBookRequest {source, source_id}` | imports a book from an external source directly into the catalog — admin-only, out of scope for regular-user UI |
| `/api/v1/external/search` | GET | none | query: `q` (required — **not** `query`), `sources?` | `ExternalSearchResponse {query, hits: ExternalSearchHit[], partial_failures: Record<string,string>}`; `ExternalSearchHit {source, title, isbns: string[], authors: string[], cover_image_url}` |

Schemas referenced above (`ContributorRole` enum: `author, co_author,
translator, illustrator, editor, narrator, foreword, other`; `ReleaseFormat`
enum: `hardcover, paperback, ebook, audiobook, other`) resolved from
`components.schemas` in the live OpenAPI dump.

### Contributions (moderation) surface — informs Block 2's "propose an edit" action, full UI is Block 7

| Endpoint | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/v1/contributions/` | POST | any authenticated user (`get_current_user`) | `CreateContributionSchema {kind: ContributionKind, target_id?: uuid\|null, payload: object}` | `ContributionResponse` (201) |
| `/api/v1/contributions/me/contributions` | GET | authenticated | query: `skip, limit` | `Page[ContributionResponse]` |
| `/api/v1/contributions/{contribution_id}` | GET, PATCH | authenticated (own) | PATCH: `UpdateContributionSchema {payload}` | `ContributionResponse` |
| `/api/v1/contributions/{contribution_id}/submit` | POST | authenticated (own) | — | `ContributionResponse` (moves `draft` → `submitted`) |
| `/api/v1/contributions/{contribution_id}` | DELETE | authenticated (own) | — | 204 |

`ContributionKind` enum: `new_book, new_release, new_contributor, edit_book,
edit_release, edit_contributor` — directly mirrors the catalog entities Block
2 covers. `ContributionStatus` enum: `draft, submitted, under_review,
approved, rejected, merged`.

## Direct-write endpoints are admin-only — confirmed against source

Reading `app/routers/books.py`, `app/routers/releases.py`,
`app/routers/contributors.py` in `bookworm-hole-api` directly (not just the
OpenAPI `security` field, which only shows "some bearer token required," not
which role): **every** POST/PATCH/DELETE on `books`, `releases`, and
`contributors` — including contributor-attachment endpoints and
`merge-into` — carries `dependencies=[Depends(require_admin)]`. Only the
`contributions` router uses the weaker `Depends(get_current_user)` (any
logged-in user, no admin check).

This means: a regular (non-admin) user calling `POST /api/v1/books/` or
`PATCH /api/v1/contributors/{id}` gets a 403, full stop — there is no
"direct edit for the owner/creator" path. The only way a non-admin user can
add or modify catalog data is by creating a `contribution` (draft →
edit payload → submit) and waiting for an admin to approve it via
`admin_contributions` (Block 7's moderation queue). Block 2's UI is scoped
accordingly: **read/browse everything, plus a "Suggest an edit" /
"Suggest a new book/release/contributor" action that creates+submits a
contribution** — never a direct edit form wired to the admin-only endpoints.
(If the logged-in user happens to be an admin, Block 7's admin UI — not
Block 2 — is where they'd get direct edit forms; that's out of scope here.)

## Architecture

- `lib/api/books.ts`, `lib/api/releases.ts`, `lib/api/contributors.ts`,
  `lib/api/external.ts`, `lib/api/contributions.ts` — typed client functions
  matching the schemas above. All these calls are read-only from the
  client's perspective except `contributions.ts`'s `createContribution` /
  `updateContribution` / `submitContribution` / `deleteContribution`, which
  go through the server-authenticated axios instance
  (`lib/api/server-client.ts` from Block 1) since they require a bearer
  token.
- Public GETs (`books`, `releases`, `contributors`, `external/search`)
  require no auth — these can be called directly from Server Components
  using a plain server-side axios instance (`lib/api/public-client.ts`,
  `baseURL: API_BASE_URL`, no `Authorization` header needed, though sending
  one when present is harmless) for SSR/SEO on catalog pages, per Block 0's
  stated goal ("SSR/SEO for public catalog pages").
- Client-side interactive bits (search-as-you-type, pagination, filters,
  "Suggest an edit" dialog) use `hooks/useBooks.ts`, `hooks/useReleases.ts`,
  `hooks/useContributors.ts`, `hooks/useExternalSearch.ts`,
  `hooks/useContributions.ts` — TanStack Query hooks calling
  `lib/api/*` client functions through the client-side BFF-aware axios
  instance from Block 1 (`lib/api/client.ts`) for anything mutating.
- New `components/catalog/` directory: `BookCard`, `BookSearchForm`,
  `BookDetailHeader`, `ReleaseList`, `ReleaseCard`, `ContributorList`,
  `ContributorCard`, `ContributorBibliography`, `ReviewsSummary` (renders
  `average_rating`/`rating_count` + a short list from `GET
  .../reviews`, "See all reviews" link deferred to Block 3),
  `ExternalSearchPanel`, `ExternalSearchHitCard`, `SuggestEditDialog`
  (kind-aware form: new_book / new_release / new_contributor / edit_book /
  edit_release / edit_contributor, builds the `payload` object and calls
  `contributions` create+submit).
- `app/(app)/books/page.tsx` — search/browse list (`BookSearchForm` +
  paginated `BookCard` grid, query params `title`, `author`, `language`,
  `skip`/`limit` synced to the URL).
- `app/(app)/books/[bookId]/page.tsx` — book detail: title/description,
  `ReleaseList` (each release shows format/publisher/ISBNs), contributor
  list by role, `ReviewsSummary`, "Suggest an edit" button.
- `app/(app)/books/[bookId]/history/page.tsx` (optional, lower priority) —
  paginated version history using `EntityVersionResponse` list +
  drill into a version via `history/{version}`.
- `app/(app)/contributors/[contributorId]/page.tsx` — contributor detail:
  bio, bibliography (books/releases they contributed to via
  `/contributors/{id}/books`), "Suggest an edit" button.
- `app/(app)/catalog/external/page.tsx` — external-source lookup: search
  form calling `GET /external/search?q=...`, results list showing
  `ExternalSearchHit`s (title, authors, isbns, cover), each hit has a
  "Suggest importing this book" action that opens `SuggestEditDialog`
  pre-filled with `kind: "new_book"` (or `new_release`) and a payload built
  from the hit — **not** a call to `POST /external/import` (admin-only).

## UI Surface

- Book search/browse (`/books`): filter by title/author/language, paginated
  results, each result a `BookCard` linking to book detail.
- Book detail (`/books/[bookId]`): full book info, releases (each with
  format/ISBNs), contributors by role, review summary, "Suggest an edit"
  entry point.
- Contributor detail (`/contributors/[contributorId]`): bio + bibliography.
- External-source lookup (`/catalog/external`): search across configured
  external sources (e.g. Open Library), preview hits, "Suggest importing"
  → opens the contribution dialog rather than writing directly.
- "Suggest an edit" / "Suggest new entry" dialog (shared component, used
  from book detail, contributor detail, and external search hit cards):
  authenticated users only (redirect to `/login` if not signed in); builds
  a `CreateContributionSchema` payload for the relevant `kind`, calls
  `POST /contributions/` then immediately `POST
  /contributions/{id}/submit` (draft→submitted in one UI action — editing
  a still-draft contribution before submitting is deferred, not needed for
  the common case). Confirmation toast: "Submitted for review."
  Non-admin users have no path to see their contribution's outcome inside
  Block 2 — a "My contributions" list (`GET
  /contributions/me/contributions`) is a nice-to-have but the full
  approve/reject lifecycle view belongs to Block 7's moderation UI; a
  minimal read-only "My Submissions" link under the user's profile menu is
  in scope if time allows, otherwise deferred.

## Data Flow & Error Handling

- `hooks/useBooks.ts` — `useBooks(filters)` (list, keeps previous data
  across pagination via `placeholderData`), `useBook(bookId)`,
  `useBookByIsbn(isbn)`, `useBookReviews(bookId, sort)`,
  `useBookHistory(bookId)`.
- `hooks/useReleases.ts` — `useRelease(releaseId)`,
  `useReleaseReviews(releaseId, sort)`, `useReleaseHistory(releaseId)`.
- `hooks/useContributors.ts` — `useContributors(filters)`,
  `useContributor(contributorId)`, `useContributorBooks(contributorId)`,
  `useContributorHistory(contributorId)`.
- `hooks/useExternalSearch.ts` — `useExternalSearch(q, sources?)`
  (`enabled: q.length > 0`, since `q` is required server-side and an empty
  query 422s).
- `hooks/useContributions.ts` — `useCreateContribution`,
  `useSubmitContribution`, `useMyContributions` mutations/queries;
  `useCreateContribution` + `useSubmitContribution` composed by
  `SuggestEditDialog` into one submit handler, invalidates
  `["contributions", "me"]` on success.
- 404s (book/release/contributor/version not found) render an inline
  "Not found" state on the detail page, not a global error boundary.
- 403 from any of the admin-gated endpoints should never surface in this
  block's normal user flows, since the UI never calls them directly for
  non-admin users — if one leaks through (e.g. a stale cached admin UI
  affordance), treat it as a bug, not a state to design UI copy for.
- 422 (`HTTPValidationError`) on contribution payloads surfaces inline
  per-field in `SuggestEditDialog`'s form.
- Loading states via Query's `isPending`/`isFetching` + `Skeleton` (list
  pages: skeleton `BookCard`/`ContributorCard` grid; detail pages: skeleton
  header + release/contributor rows).

## Testing Strategy

- Vitest + RTL: `BookSearchForm`, `BookCard`, `BookDetailHeader`,
  `ReleaseList`, `ContributorCard`, `ContributorBibliography`,
  `ExternalSearchPanel`, `SuggestEditDialog` — render, interaction
  (filter submit, pagination, dialog open/submit), mocked API via `msw`
  covering success + 404/422 branches.
- Hook tests: mocked success + error branches for each query/mutation
  hook, including `useExternalSearch`'s `enabled` gating on empty `q`.
- Playwright: one happy-path e2e — browse books → open book detail → open
  contributor detail → run an external search → open "Suggest an edit" →
  submit a contribution (asserts a 201 then a submitted-status follow-up
  call, not an approval outcome, since approval is Block 7/admin-only).
- A second Playwright path (or the same test, extended) can assert that no
  admin-only UI (edit/delete forms) renders for a non-admin session, since
  that's exactly the gap a naive read of the OpenAPI spec (which shows
  "auth required," not "admin required") could tempt into building
  incorrectly.

## Out of Scope (this block)

- Direct create/edit/delete forms for books/releases/contributors wired to
  `POST/PATCH/DELETE /books`, `/releases`, `/contributors` and
  `POST /external/import` — these are `require_admin`-gated; the
  corresponding UI belongs to Block 7 (Admin), not here.
- `merge-into` duplicate-book merging — admin/moderation tooling, Block 7.
- Contribution moderation (approve/reject queue, `admin_contributions`
  router) — Block 7.
- Full review CRUD and review detail UI — Block 3 (Collections & Reviews);
  Block 2 only reads the book/release review list for a summary on the
  detail page.
- A full "My Submissions" contribution-status tracker beyond a minimal
  read-only list — full lifecycle UI is Block 7-adjacent.

## Open Questions / Gaps Noted for Block 8 Audit

- `GET /contributors/{contributor_id}` returns the flat `ContributorResponse`
  shape (no bibliography), while `ContributorDetailResponse` (with
  `books_by_role` / `releases_by_role`) exists in the schema but isn't
  wired to any endpoint found in this pass — `GET
  /contributors/{contributor_id}/books` appears to be the intended way to
  get bibliography data instead, returning some paginated shape (not
  independently confirmed against a populated DB, since the local database
  had zero contributors at verification time). Flag for Block 8: either
  `ContributorDetailResponse` is dead schema (unused, candidate to remove)
  or `GET /contributors/{contributor_id}` should be returning it instead of
  the flat shape.
- `/books/{book_id}/history` and `/contributors/.../history` for a
  nonexistent parent ID return `200` with an empty `Page` rather than 404 —
  inconsistent with `/books/{book_id}` itself, which 404s. Not treated as a
  blocking bug (it's a defensible "no history" answer), but worth a
  Block 8 consistency note.
