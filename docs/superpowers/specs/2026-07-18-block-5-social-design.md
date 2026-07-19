# Block 5 (Social) — Design

## Purpose

Covers the `friends` API router plus the `users` router's public-profile
surface (`GET /users/{username}`, `GET /users/{user_id}/reviews`) as
consumed for social features: friend list, sending/accepting/declining
friend requests, unfriending, blocking/unblocking, and viewing a
friend's/public user's profile (their public collections and reviews).
Builds on Block 1's BFF cookie-auth pattern and `lib/api/`/`hooks/`
conventions; does not redefine collection/library/review UI components
themselves (Block 3 owns those) — this block only adds the friend-scoped
_read_ views that reuse Block 3's presentational components against
friend-scoped endpoints.

## Real API surface (verified against running OpenAPI schema and live-tested against the running API)

All endpoints tested live with two freshly registered users (`social_test_a`,
`social_test_b`): send request → list incoming/outgoing → accept → list
friends (both directions) → public profile lookup → user reviews →
friend-scoped collections/library → unfriend → block → unblock. Every
response matched its documented OpenAPI schema exactly, with correct status
codes (201/200/204/422 as documented). No bugs found — no API Blocker
section needed for this block.

| Endpoint                                           | Method | Request                                | Response                                                                                                                                 |
| -------------------------------------------------- | ------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/friends/`                                 | GET    | — (bearer)                             | `FriendResponse[] {user_id, username, display_name, avatar_url, since}`                                                                  |
| `/api/v1/friends/requests`                         | POST   | `SendFriendRequestSchema {username}`   | 201 `FriendRequestResponse {id, requester_id, addressee_id, status: FriendshipStatus, created_at, responded_at}`                         |
| `/api/v1/friends/requests/incoming`                | GET    | — (bearer)                             | `FriendRequestResponse[]` — requests where current user is `addressee_id`                                                                |
| `/api/v1/friends/requests/outgoing`                | GET    | — (bearer)                             | `FriendRequestResponse[]` — requests where current user is `requester_id`                                                                |
| `/api/v1/friends/requests/{friendship_id}/accept`  | POST   | — (bearer)                             | 200 `FriendRequestResponse` (`status: "accepted"`, `responded_at` set)                                                                   |
| `/api/v1/friends/requests/{friendship_id}/decline` | POST   | — (bearer)                             | 200 `FriendRequestResponse` (`status: "declined"`, `responded_at` set)                                                                   |
| `/api/v1/friends/{user_id}`                        | DELETE | — (bearer)                             | 204 — unfriend                                                                                                                           |
| `/api/v1/friends/{user_id}/block`                  | POST   | — (bearer)                             | 201 `FriendRequestResponse` (`status: "blocked"`)                                                                                        |
| `/api/v1/friends/{user_id}/block`                  | DELETE | — (bearer)                             | 204 — unblock                                                                                                                            |
| `/api/v1/friends/{user_id}/collections`            | GET    | query `skip?, limit?`                  | `Page_CollectionResponse_ {items: CollectionResponse[], total, limit, offset}` — friend-scoped read of that user's collections           |
| `/api/v1/friends/{user_id}/library`                | GET    | query `skip?, limit?`                  | `Page_BookStatusResponse_ {items: BookStatusResponse[], total, limit, offset}` — friend-scoped read of that user's library/book statuses |
| `/api/v1/users/{username}`                         | GET    | path `username`, query `skip?, limit?` | `PublicUserProfileResponse {username, display_name, bio, avatar_url, collections: Page_CollectionResponse_}`                             |
| `/api/v1/users/{user_id}/reviews`                  | GET    | query `sort?, skip?, limit?`           | `Page_ReviewResponse_ {items: ReviewResponse[], total, limit, offset}`                                                                   |

`FriendshipStatus` enum: `pending | accepted | declined | blocked`.

`friends/{user_id}/collections` and `friends/{user_id}/library` are
referenced here only as the friend-scoped data sources consumed by this
block's friend-profile view — the collection/library UI itself
(list/detail rendering, add/remove-book flows) is Block 3's
`components/collections/`, `components/reading/` (or equivalent); this
block reuses those presentational components in read-only mode against
these friend-scoped endpoints rather than re-implementing them.

## Gap: no dedicated "search users" endpoint

The API exposes only an **exact-match** public profile lookup,
`GET /api/v1/users/{username}`. There is no query-param search endpoint
(e.g. `GET /api/v1/users?q=...`) anywhere in the OpenAPI schema — confirmed
by listing every path under `/api/v1/users` and `/api/v1/friends`. This
means the "search users" UI surface named in the original repo design spec
(Block 5 row: "Friend list, requests, search users") can only be
implemented as an **exact-username lookup form** ("Find by username"), not
a fuzzy/partial search. Flagged here as a gap for Block 8's API audit —
a real search-by-username(-prefix) or search-by-display-name endpoint is
a candidate to add on the API side.

## Architecture

Follows Block 0/1 conventions:

- `lib/api/friends.ts` — typed client functions: `listFriends`,
  `sendFriendRequest`, `listIncomingRequests`, `listOutgoingRequests`,
  `acceptFriendRequest`, `declineFriendRequest`, `removeFriend`,
  `blockUser`, `unblockUser`, `getFriendCollections`, `getFriendLibrary`.
- `lib/api/users.ts` (extended from Block 1, or new file if Block 1 only
  covered `/users/me`) — adds `getPublicProfile(username)` and
  `getUserReviews(userId, params)`.
- All calls go through the server-authenticated axios instance
  (`lib/api/server-client.ts` from Block 1, `Authorization: Bearer` from
  the cookie) since every `friends` endpoint requires auth; the public
  profile/reviews endpoints also send the bearer token when called from
  an authenticated session (needed so the API can compute friend-relative
  visibility, if any — verified: both endpoints returned 200 with a
  bearer token from a non-friend/friend account without different
  behavior observed in this test pass, so no additional relationship
  gating logic to model in the UI beyond what the API already returns).
- `hooks/useFriends.ts` — TanStack Query hooks:
  - Queries: `useFriends()`, `useIncomingRequests()`,
    `useOutgoingRequests()`, `useFriendCollections(userId)`,
    `useFriendLibrary(userId)`.
  - Mutations: `useSendFriendRequest()`, `useAcceptFriendRequest()`,
    `useDeclineFriendRequest()`, `useRemoveFriend()`, `useBlockUser()`,
    `useUnblockUser()` — each invalidates `["friends"]` and/or
    `["friend-requests", "incoming"|"outgoing"]` on success as
    appropriate (e.g. accept invalidates both the request lists and the
    friend list).
- `hooks/useUserProfile.ts` — `usePublicProfile(username)`,
  `useUserReviews(userId, params)`.
- `components/friends/` — `FriendListItem`, `FriendRequestCard` (incoming,
  with Accept/Decline buttons; outgoing, with a "pending" badge and no
  actions), `FindUserForm` (exact-username lookup, see Gap above),
  `BlockUserDialog`/`UnfriendDialog` (shadcn `Dialog` confirms, per Block
  1's delete-account pattern), `FriendProfileHeader` (avatar, display
  name, username, friend/unfriend/block actions).
- `components/users/` (or co-located under `friends/` since this is the
  only block consuming it) — `PublicProfileCard`, reusing Block 3's
  collection-card and review-card presentational components in read-only
  mode fed by `useFriendCollections`/`useFriendLibrary`/`useUserReviews`.

## UI Surface

- `app/(app)/friends/page.tsx` — friend list (`useFriends`), tabs
  (shadcn `Tabs`, per Block 0 kit) for "Friends" / "Requests" /
  "Find people":
  - **Friends tab:** list of `FriendListItem` (avatar, display name,
    username, since date, "View profile" link, "Unfriend"/"Block"
    actions behind a confirm `Dialog`).
  - **Requests tab:** two sub-lists — Incoming (`FriendRequestCard` with
    Accept/Decline buttons calling the respective mutations) and Outgoing
    (read-only, pending badge).
  - **Find people tab:** `FindUserForm` — single username input, submits
    to `GET /users/{username}`; on 404 shows "No user found with that
    username"; on success shows a `PublicProfileCard` preview with a
    "Send friend request" button (`useSendFriendRequest`).
- `app/(app)/friends/[username]/page.tsx` — friend/public profile page:
  header (`FriendProfileHeader`), public collections
  (`useFriendCollections` if already friends, else the profile's embedded
  `collections` field from `GET /users/{username}` for non-friends — both
  return the same `Page_CollectionResponse_` shape so the same
  presentational component renders either), and public reviews
  (`useUserReviews`). Friend-only actions (unfriend/block) shown
  conditionally based on whether the viewed user appears in the current
  user's `useFriends()` result.
- Header nav (Block 0/1's `components/layout/header.tsx`) — "Friends" nav
  link (already scaffolded as a placeholder in Block 0) now points at
  `/friends`; optionally a small badge showing incoming-request count
  (`useIncomingRequests().data?.length`).

## Data Flow & Error Handling

- Sending a friend request to a non-existent username surfaces the
  API's 404/422 as a form-level error under `FindUserForm` (not yet
  verified live for the not-found case in this pass — the 422 schema for
  validation errors is documented per `HTTPValidationError`; a
  not-found-username case would be a distinct error the UI should still
  handle via the same inline-alert pattern used in Block 1 for
  409/401-style domain errors).
- Duplicate/already-friends/already-pending request attempts: expected to
  surface as a domain error (409-style) per the same pattern as Block 1's
  duplicate-email handling — form-level alert, not silently retried.
- Accept/decline act on a `friendship_id`, not a `user_id` — the UI must
  carry the `id` field from `FriendRequestResponse` through the incoming-
  request list into the accept/decline mutation calls (not the
  `requester_id`).
- Loading states via Query `isPending`/`isFetching` + `Skeleton` (Block 0
  kit) for friend list, request lists, and profile pages.
- Pagination: `friends/{user_id}/collections`, `friends/{user_id}/library`,
  `users/{username}` (embedded collections), and `users/{user_id}/reviews`
  all use the same `skip`/`limit` + `Page_X_ {items, total, limit, offset}`
  envelope — reuse Block 3's pagination component/hook pattern rather than
  building a new one for this block.

## Testing Strategy

- Vitest + RTL: `FriendListItem`, `FriendRequestCard` (incoming actions
  fire the right mutation; outgoing renders read-only), `FindUserForm`
  (submit, not-found error, success preview), unfriend/block confirm
  dialogs. Mock API with `msw`.
- Hook tests: mocked success + error branches for every query/mutation in
  `useFriends.ts` and `useUserProfile.ts`, including cache-invalidation
  assertions (e.g. accepting a request invalidates both request-list
  queries and the friend-list query).
- Playwright: one happy-path e2e using two seeded/registered test
  accounts — user A sends a friend request to user B, user B accepts from
  the Requests tab, both users see each other in their Friends tab, user A
  views user B's profile page and sees B's public collections/reviews.
  This mirrors the exact flow manually verified live against the API
  during this spec's research (register A, register B, send request,
  accept, list friends both directions, view profile, unfriend, block,
  unblock — all returned correct status codes and schemas).

## Out of Scope (this block)

- Full collection/library/review CRUD UI — owned by Block 3; this block
  only consumes the friend-scoped _read_ endpoints
  (`friends/{user_id}/collections`, `friends/{user_id}/library`) and the
  public-profile embedded collections, rendering them with Block 3's
  existing presentational components.
- Fuzzy/partial user search — no such endpoint exists in the current API
  surface (see "Gap" section above); only exact-username lookup is
  implemented. Flagged for Block 8 API audit as a candidate endpoint to
  add.
- Friend activity feed / notifications for new friend requests beyond a
  simple nav badge count — no `chat`/notification-push mechanism exists
  yet (that's Block 6's `chat` router, and even that may not cover
  friend-request notifications); out of scope here.
- Mutual-friends display, friend suggestions, or any social-graph feature
  beyond direct list/request/block — not present in the API.
