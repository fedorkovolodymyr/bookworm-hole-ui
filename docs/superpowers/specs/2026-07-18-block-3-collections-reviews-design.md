# Block 3 (Collections & Reviews) — Design

## Purpose

Third domain block, built on Block 0's shell/kit and Block 1's auth/session
pattern (Block 2's catalog block supplies book/release lookups this block
consumes). Covers the `collections`, `reviews`, and the status-tracking
surface of the API (`me/statuses` plus its derived views) and the
lightweight `share` endpoints. UI surface: user-owned collections CRUD, add/
remove/reorder books within a collection, review CRUD on a book/release,
a personal "my books" status feed (library/wishlist/lent-out/borrowed) with
lend/return actions, and "share a book or collection" entry points.

## Naming note: original spec vs. real API

The original repo design spec (`docs/specs/2026-07-13-ui-repo-design.md`)
lists this block's routers as `collections`, `reviews`, `statuses`,
`status_views`, `share` — implying a `statuses` CRUD router plus a separate
`status_views` read router. The real API does not split these: everything
lives under `/api/v1/me/statuses/` (CRUD + `/lend` + `/return` actions) and
four thin, pre-filtered read views — `/api/v1/me/library`,
`/api/v1/me/wishlist`, `/api/v1/me/lent-out`, `/api/v1/me/borrowed` — which
are really just `GET /me/statuses/` with a server-side `status` filter
baked in (each returns the same `Page[BookStatusResponse]` shape). There is
no generic `?status=` fan-out endpoint beyond `GET /me/statuses/?status=...`
itself. This spec treats "statuses" and "status views" as one client module
(`lib/api/statuses.ts`) rather than two, matching the real surface.

Additionally, `share/book/{id}` and `share/collection/{id}` do not create a
standalone "share link" resource (no public/shareable URL is returned).
Both endpoints post a message into the recipient's chat thread and return a
`ChatMessageResponse` (`id, thread_id, sender_id, body, attachment_book_id,
attachment_collection_id, read_at, created_at`) — sharing is "send this
book/collection to a friend via chat," not link generation. Chat itself
(reading/rendering the thread) is Block 6's domain; this block only needs
to fire the share action and show a "Shared!" confirmation toast — it does
not render the resulting thread.

## Real API surface (verified against running OpenAPI schema + live curl tests)

### Collections

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/v1/collections/` | POST | `CreateCollectionSchema {name, description?, is_public=false, cover_image_url?}` | 201 `CollectionResponse {id, user_id, name, description, is_public, cover_image_url, sort_order, created_at, updated_at}` |
| `/api/v1/collections/` | GET | query `skip=0, limit=10 (max 100)` | 200 `Page[CollectionResponse] {items[], total, limit, offset}` |
| `/api/v1/collections/{collection_id}` | GET | query `items_skip=0, items_limit=10` | 200 `CollectionDetailResponse` — `CollectionResponse` fields + `items: Page[CollectionItemResponse]` |
| `/api/v1/collections/{collection_id}` | PATCH | `UpdateCollectionSchema {name?, description?, is_public?, cover_image_url?}` (all optional/nullable) | 200 `CollectionResponse` |
| `/api/v1/collections/{collection_id}` | DELETE | — | 204 |
| `/api/v1/collections/{collection_id}/items` | POST | `AddCollectionItemSchema {book_id?, release_id?, note?}` — exactly one of `book_id`/`release_id` required (custom validator, see below) | 201 `CollectionItemResponse {id, collection_id, book_id, release_id, position, added_at, note}` |
| `/api/v1/collections/{collection_id}/items/{item_id}` | PATCH | `UpdateCollectionItemSchema {position?, note?}` | 200 `CollectionItemResponse` |
| `/api/v1/collections/{collection_id}/items/{item_id}` | DELETE | — | 204 |
| `/api/v1/collections/{collection_id}/reorder` | POST | `ReorderItemsSchema {item_ids: uuid[]}` (full ordered list of item ids) | 204 |

### Reviews

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/v1/reviews/` | POST | `CreateReviewSchema {book_id?, release_id?, rating? (1-5), title?, body?, is_public=true, contains_spoilers=false}` — exactly one of `book_id`/`release_id` required | 201 `ReviewResponse {id, user_id, book_id, release_id, rating, title, body, is_public, contains_spoilers, created_at, updated_at}` |
| `/api/v1/reviews/{review_id}` | GET | — | 200 `ReviewResponse` |
| `/api/v1/reviews/{review_id}` | PATCH | `UpdateReviewSchema {rating?, title?, body?, is_public?, contains_spoilers?}` (all optional) | 200 `ReviewResponse` |
| `/api/v1/reviews/{review_id}` | DELETE | — | 204 |
| `/api/v1/books/{book_id}/reviews` | GET | (Block 2 territory — reused here for the book-detail review list) | `Page[ReviewResponse]` — see Block 2 spec for full shape |
| `/api/v1/releases/{release_id}/reviews` | GET | (same, per-release) | `Page[ReviewResponse]` — see Block 2 spec |

`book_id`/`release_id` on both `AddCollectionItemSchema` and
`CreateReviewSchema`/`CreateBookStatusSchema` are individually nullable in
the OpenAPI schema, but a Pydantic model validator enforces "exactly one of
book_id or release_id is required" server-side — confirmed live: posting
neither returns `422 {"detail":[{"type":"value_error","loc":["body"],
"msg":"Value error, exactly one of book_id or release_id is required", ...}]}`.
This is not expressible as a JSON Schema `oneOf` in the generated OpenAPI
doc, so UI forms must enforce "pick a book OR a specific release, not
neither/both" client-side and surface this exact 422 message if it slips
through.

### Statuses (personal book status: owned/wishlist/lent/borrowed/etc.)

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/v1/me/statuses/` | POST | `CreateBookStatusSchema {book_id?, release_id?, status: BookStatusKind, notes?}` — exactly one of `book_id`/`release_id` required | 201 `BookStatusResponse` |
| `/api/v1/me/statuses/` | GET | query `status?: BookStatusKind` (optional filter) | 200 `BookStatusResponse[]` (plain array, **not** paginated — differs from the `me/library`/`wishlist`/`lent-out`/`borrowed` views below, which *are* paginated) |
| `/api/v1/me/statuses/{status_id}` | PATCH | `UpdateBookStatusSchema {status?, notes?}` | 200 `BookStatusResponse` |
| `/api/v1/me/statuses/{status_id}` | DELETE | — | 204 |
| `/api/v1/me/statuses/{status_id}/lend` | POST | `LendBookStatusSchema {lent_to_user_id?, lent_to_name?}` (either a known friend's user id or a free-text name) | 200 `BookStatusResponse` (sets `lent_to_user_id`/`lent_to_name`/`lent_at`, implicitly moves `status` to `lent_out`) |
| `/api/v1/me/statuses/{status_id}/return` | POST | — | 200 `BookStatusResponse` (sets `returned_at`, clears lend fields) |
| `/api/v1/me/library` | GET | query `sort: "acquired_at"\|"title" = "acquired_at"`, `skip=0`, `limit=10` | 200 `Page[BookStatusResponse]` |
| `/api/v1/me/wishlist` | GET | same query params | 200 `Page[BookStatusResponse]` |
| `/api/v1/me/lent-out` | GET | same query params | 200 `Page[BookStatusResponse]` |
| `/api/v1/me/borrowed` | GET | same query params | 200 `Page[BookStatusResponse]` |

`BookStatusKind` enum: `owned, wishlist, pre_order, lent_out, borrowed,
gifted_away, sold, lost`.

`BookStatusResponse` shape: `{id, user_id, book_id, release_id, status,
acquired_at, notes, lent_to_user_id, lent_to_name, lent_at, returned_at,
created_at, updated_at}`.

The four `me/{library,wishlist,lent-out,borrowed}` views are almost
certainly `GET /me/statuses/` server-side pre-filtered by
`status IN (owned/pre_order), wishlist, lent_out, borrowed` respectively,
re-exposed with pagination — worth noting for Block 8's audit as a
candidate for consolidation (`GET /me/statuses/?status=X` already gives
per-kind filtering; the 4 named views only add pagination + a `sort` param
that the base list endpoint lacks).

### Share

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/v1/share/book/{book_id}` | POST | `ShareBookSchema {friend_id: uuid, message: string}` | 200 `ChatMessageResponse {id, thread_id, sender_id, body, attachment_book_id, attachment_collection_id, read_at, created_at}` |
| `/api/v1/share/collection/{collection_id}` | POST | `ShareCollectionSchema {friend_id: uuid, message: string}` | 200 `ChatMessageResponse` (same shape, `attachment_collection_id` set instead) |

### Friends' collections/library (read-only social viewing)

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/v1/friends/{user_id}/collections` | GET | query `skip=0, limit=10` | 200 `Page[CollectionResponse]` — only that friend's `is_public` collections are expected to be visible (enforced server-side; not separately documented in the schema, verify at implementation time) |
| `/api/v1/friends/{user_id}/library` | GET | query `skip=0, limit=10` | 200 `Page[BookStatusResponse]` |

These two are technically friend-scoped reads (Block 5 owns the `friends`
router's relationship CRUD), but they're the natural "view a friend's
shelf" counterpart to this block's own `me/library` — included here since
the UI surface (a read-only collections/library view rendered with the same
components as the user's own) belongs next to this block's components, not
Block 5's friend-request management UI.

## Architecture

- `lib/api/collections.ts` — `listCollections`, `getCollection`,
  `createCollection`, `updateCollection`, `deleteCollection`,
  `addCollectionItem`, `updateCollectionItem`, `removeCollectionItem`,
  `reorderCollectionItems`.
- `lib/api/reviews.ts` — `createReview`, `getReview`, `updateReview`,
  `deleteReview` (list-by-book/release reuses Block 2's `lib/api/books.ts`
  functions, e.g. `getBookReviews(bookId)`).
- `lib/api/statuses.ts` — `listStatuses(status?)`, `createStatus`,
  `updateStatus`, `deleteStatus`, `lendStatus`, `returnStatus`,
  `getLibrary`, `getWishlist`, `getLentOut`, `getBorrowed` (the four view
  functions share one internal `getStatusView(view, params)` helper since
  they're identical in shape/params, differing only in path).
- `lib/api/share.ts` — `shareBook(bookId, {friendId, message})`,
  `shareCollection(collectionId, {friendId, message})`.
- `lib/api/friends-content.ts` (or folded into `collections.ts`/
  `statuses.ts` as `getFriendCollections`/`getFriendLibrary`) — read-only
  friend-scoped views.
- All client functions use the server-authenticated axios instance
  established in Block 1 (`lib/api/server-client.ts` for Server
  Components/route handlers; the client-side instance attaches the bearer
  token via the BFF cookie flow already wired in Block 1 — no new auth
  plumbing needed this block).

## UI Surface

- `app/(app)/collections/page.tsx` — grid/list of the user's own
  collections (`useCollections()`), "New collection" button opening a
  `Dialog` form (name, description, public toggle, cover image URL).
- `app/(app)/collections/[id]/page.tsx` — collection detail: header (name,
  description, edit/delete actions via a dropdown), paginated item grid
  (`CollectionDetailResponse.items`), drag-to-reorder (calls `reorder`
  with the full reordered `item_ids` list — optimistic update via Query
  cache, rollback on 422/error), per-item note edit, remove-item button,
  "Share this collection" action opening a friend-picker dialog that calls
  `shareCollection`.
- `components/collections/collection-card.tsx`,
  `collection-form.tsx`, `collection-item-card.tsx`,
  `add-to-collection-dialog.tsx` (reusable from book-detail pages — Block
  2's book detail page gets a "Add to collection" button wired to this
  dialog, which lists the user's collections via `useCollections()` and
  calls `addCollectionItem`).
- `components/reviews/review-form.tsx` — rating (star input, 1-5),
  title, body, public/spoiler toggles; used both for "write a review" on a
  book-detail page (Block 2's surface, this block supplies the component)
  and on a "my reviews" management view.
- `components/reviews/review-list.tsx`, `review-card.tsx` — renders
  `Page[ReviewResponse]` from `books/{id}/reviews` or
  `releases/{id}/reviews`, with edit/delete actions gated to the review's
  own author (compare `review.user_id` to the session user).
- `app/(app)/library/page.tsx` — tabs (shadcn `Tabs`) for
  Library / Wishlist / Lent Out / Borrowed, each backed by its own query
  hook and `Page[BookStatusResponse]` pagination; a "Change status" action
  per row (opens a `Select` of `BookStatusKind`, calls `updateStatus`).
  Lent Out rows get a "Mark returned" button (`returnStatus`); Library/
  Wishlist rows get a "Lend to..." action (friend picker or free-text
  name, calls `lendStatus`).
- `components/statuses/status-badge.tsx`,
  `status-list-item.tsx`, `lend-dialog.tsx`, `return-confirm-dialog.tsx`.
- `app/(app)/friends/[userId]/page.tsx` (or a tab on a friend-profile
  route, coordinate with Block 5's friend-profile shell once it exists) —
  read-only render of `getFriendCollections`/`getFriendLibrary` reusing
  `CollectionCard`/`StatusListItem` in a disabled/no-action mode.
- Share entry points: a "Share" icon button on `BookCard`/book-detail
  (Block 2 surface) and on `CollectionCard`/collection-detail, opening a
  shared `components/share/share-dialog.tsx` (friend picker + message
  textarea) that calls `shareBook`/`shareCollection` and shows a success
  toast — does not navigate to chat (Block 6 not yet built).

## Data Flow & Error Handling

- `hooks/useCollections.ts` — `useCollections()` (list, paginated),
  `useCollection(id)` (detail), `useCreateCollection`,
  `useUpdateCollection`, `useDeleteCollection`, `useAddCollectionItem`,
  `useUpdateCollectionItem`, `useRemoveCollectionItem`,
  `useReorderCollectionItems` — all mutations invalidate
  `["collections"]` and/or `["collections", id]` on success; item mutations
  invalidate the specific collection's detail query.
- `hooks/useReviews.ts` — `useReview(id)`, `useCreateReview`,
  `useUpdateReview`, `useDeleteReview` — invalidate the relevant
  `["books", bookId, "reviews"]` / `["releases", releaseId, "reviews"]`
  list query (Block 2's query keys) plus `["reviews", id]`.
- `hooks/useStatuses.ts` — `useStatuses(status?)`, `useLibrary()`,
  `useWishlist()`, `useLentOut()`, `useBorrowed()`, `useCreateStatus`,
  `useUpdateStatus`, `useDeleteStatus`, `useLendStatus`, `useReturnStatus`
  — all mutations invalidate `["statuses"]` broadly (cheap given expected
  per-user data volume) rather than fine-grained per-view keys, since a
  single status change (e.g. lend) affects both `me/library` and
  `me/lent-out` simultaneously.
- `hooks/useShare.ts` — `useShareBook`, `useShareCollection` — no cache
  invalidation needed (result isn't rendered by this block); on success
  show a toast, on error surface inline in the share dialog.
- `hooks/useFriendContent.ts` — `useFriendCollections(userId)`,
  `useFriendLibrary(userId)` — read-only queries, standard `isPending`/
  `error` handling, no mutations.
- Validation errors (422, including the "exactly one of book_id or
  release_id" custom-validator message) surface as a form-level alert
  under the relevant dialog/form — this particular message isn't
  field-attributable (`loc: ["body"]`, not a specific field), so it must
  render as a general form error, not an inline per-field one.
- 403/404 on friend-scoped reads (viewing a non-friend's library, or a
  private collection) render an inline "not available" state, not a crash
  boundary.
- Loading via Query `isPending`/`isFetching` + `Skeleton` grids/lists from
  Block 0's kit; optimistic updates for reorder and lend/return with
  rollback on error (toast + cache revert).

## Testing Strategy

- Vitest + RTL: `CollectionForm`, `CollectionItemCard`, `ReviewForm`,
  `ReviewCard`, `StatusListItem`, `LendDialog`, `ShareDialog` — render,
  validation (required name on collection create, rating range 1-5 on
  review, "pick book or release" guard on add-to-collection/create-review/
  create-status), submit calls the correct mutation. Mock the API with
  `msw`.
- Hook tests: mocked success + error (404, 422, 403) branches for every
  query/mutation in `useCollections`, `useReviews`, `useStatuses`,
  `useShare`, `useFriendContent`.
- Playwright: one happy-path e2e — create a collection, add a book to it
  (via Block 2's book-detail "Add to collection" action), reorder items,
  leave a review on that book, mark the book's status wishlist → owned,
  lend it to a friend, mark it returned — against the live API once
  Block 2's catalog has seed data to attach items/reviews/statuses to.
- Live API verification performed for this spec (2026-07-18): registered a
  fresh test user, then exercised `POST/GET/PATCH/DELETE
  /api/v1/collections/` and `/collections/{id}` end-to-end (create → list
  → update → detail → delete, all 2xx, response shapes matched the
  documented schemas exactly) and confirmed the "exactly one of book_id or
  release_id" 422 validator on both `POST /reviews/` and
  `POST /me/statuses/` with no seed books present. No shape mismatches, no
  500s — no API Blocker section needed for this block.

## Out of Scope (this block)

- Rendering the chat thread that `share/*` posts into — that's Block 6
  (`chat` router). This block only fires the share action and shows a
  confirmation toast.
- Friend request/relationship management (`friends` CRUD: sending/
  accepting/removing) — Block 5. This block only consumes the two
  read-only `friends/{user_id}/collections` and `friends/{user_id}/library`
  views for "view a friend's shelf."
- Reading-session tracking and stats dashboards — Block 4
  (`reading_sessions`, `reading_stats`).
- A generic public "share link" (copyable URL, no login required) — does
  not exist in the current API; `share/*` only supports friend-to-friend
  in-app chat delivery. Flagged for Block 8's API audit as a possible gap
  if a public-link feature is ever desired.
- Consolidating `me/library`/`wishlist`/`lent-out`/`borrowed` into a single
  parameterized endpoint — flagged as a Block 8 audit candidate, not an
  implementation concern for this block (the UI just calls whichever of
  the four exists).
