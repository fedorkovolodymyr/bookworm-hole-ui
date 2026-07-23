# Block 5 (Social) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Social domain (Block 5) end-to-end per `docs/superpowers/specs/2026-07-18-block-5-social-design.md`: friend list, send/accept/decline/unfriend/block/unblock, exact-username lookup ("Find people"), and a friend/public profile page — covering the `friends` router plus the `users` router's public-profile surface.

**Architecture:** Follows the established per-domain shape from Blocks 1-4: `lib/api/friends.ts` (typed axios calls for the friend-relationship endpoints) → `hooks/useFriends.ts` (TanStack Query queries/mutations) → `components/friends/*` (presentational, Storybook-covered, `next-intl` for copy) → `app/(app)/friends/page.tsx` (list/requests/find-people tabs) + a reworked `app/(app)/friends/[userId]/page.tsx` (full profile header + actions, not just the shelf). **Reuses, does not duplicate,** work that already landed as part of Block 3's share feature: `lib/api/friends-content.ts` (`getFriendCollections`/`getFriendLibrary`) and `hooks/useFriendContent.ts` (`useFriendCollections`/`useFriendLibrary`) already exist and are left untouched; `app/(app)/friends/[userId]/page.tsx` already renders the collections+library shelf using them — this plan extends that page with a profile header and friend actions rather than replacing its shelf-rendering logic. `lib/api/users.ts` already exists (Block 1, `/users/me` self-profile) and is extended (not recreated) with the public-profile functions.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, axios, shadcn/ui components already in `components/ui/` (`Tabs`, `Dialog`, `Card`, `Badge`, `Avatar`), `next-intl` for i18n (`messages/en.json` + `messages/uk.json`), Vitest + React Testing Library + `msw` for tests, Storybook for component stories. No new npm dependency.

## Global Constraints

- All API calls from client components go through `apiClient` (`lib/api/client.ts`, baseURL `/api`, `withCredentials: true`) — never call the backend directly from the browser.
- Every domain hook file follows `hooks/use<Domain>.ts` naming; every query/mutation invalidates the query keys documented under "Interfaces" in each task below — copy them exactly, later tasks depend on them.
- Every user-facing string goes through `useTranslations("friends.<subkey>")` (or `"shell.nav"` for the header link) and must be added to **both** `messages/en.json` and `messages/uk.json` in the same commit — a missing key in one file is a bug, not a follow-up.
- Every component in `components/friends/` ships a `.stories.tsx` (Storybook) and a `.test.tsx` (Vitest + RTL) alongside it, matching the file-triplet pattern used in `components/reading/` and `components/statuses/`.
- Accept/decline act on a `friendship_id` (the `id` field of `FriendRequestResponse`), never on `requester_id`/`addressee_id` — carry `id` through the incoming-request list into the mutation call.
- Do not touch `lib/api/friends-content.ts`, `hooks/useFriendContent.ts`, or the existing shelf-rendering JSX inside `app/(app)/friends/[userId]/page.tsx` (the collections/library sections) — those already work and are out of scope; only add to that page.
- Do not build a fuzzy/partial user-search UI — only exact-username lookup via `GET /users/{username}` (per the spec's documented API gap).
- No book/release/review CRUD UI here — reuse `components/collections/collection-card.tsx` and `components/statuses/status-list-item.tsx` (already used by the existing shelf page) and `components/reviews/` presentational components in read-only mode.
- Run `pnpm lint`, `pnpm typecheck`, and the relevant `pnpm test` scope before every commit that touches source files.

---

### Task 1: Friends domain types

**Files:**

- Modify: `lib/api/types.ts` (append a new `// --- Friends domain types ---` section at the end of the file)

**Interfaces:**

- Consumes: nothing (pure type definitions).
- Produces: `FriendshipStatus`, `FriendResponse`, `FriendRequestResponse`, `SendFriendRequestPayload`, `PublicUserProfileResponse` — exact shapes below, used by every later task.

- [x] **Step 1: Append the friends domain types**

Add to the end of `lib/api/types.ts`:

```typescript
// --- Friends domain types ---

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export interface FriendResponse {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  since: string;
}

export interface FriendRequestResponse {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  responded_at: string | null;
}

export interface SendFriendRequestPayload {
  username: string;
}

export interface PublicUserProfileResponse {
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  collections: Page<CollectionResponse>;
}
```

- [x] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (types are additive, nothing consumes them yet; `Page` and `CollectionResponse` are already defined earlier in the file).

- [x] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(friends): add friends domain types"
```

**STATUS: DONE — committed as f71cfa0 on worktree-block-5-social (cherry-picked from a stray main commit, verified present and typechecking clean in this worktree).**

---

### Task 2: Friends API client

**Files:**

- Create: `lib/api/friends.ts`
- Create: `lib/api/friends.test.ts`

**Interfaces:**

- Consumes: `apiClient` from `lib/api/client.ts`; types from Task 1 (`FriendResponse`, `FriendRequestResponse`, `SendFriendRequestPayload`).
- Produces: `listFriends()`, `sendFriendRequest(payload)`, `listIncomingRequests()`, `listOutgoingRequests()`, `acceptFriendRequest(friendshipId)`, `declineFriendRequest(friendshipId)`, `removeFriend(userId)`, `blockUser(userId)`, `unblockUser(userId)` — exact names/signatures every later task calls.

- [ ] **Step 1: Write the failing test**

Create `lib/api/friends.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "./friends";

describe("friends API client", () => {
  it("listFriends fetches /friends/", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([{ user_id: "u1", username: "bob" }])),
    );
    const result = await listFriends();
    expect(result[0].username).toBe("bob");
  });

  it("sendFriendRequest posts to /friends/requests", async () => {
    server.use(
      http.post("/api/friends/requests", () =>
        HttpResponse.json(
          {
            id: "f1",
            requester_id: "u1",
            addressee_id: "u2",
            status: "pending",
            created_at: "now",
            responded_at: null,
          },
          { status: 201 },
        ),
      ),
    );
    const result = await sendFriendRequest({ username: "bob" });
    expect(result.id).toBe("f1");
  });

  it("listIncomingRequests fetches /friends/requests/incoming", async () => {
    server.use(
      http.get("/api/friends/requests/incoming", () =>
        HttpResponse.json([{ id: "f1", status: "pending" }]),
      ),
    );
    const result = await listIncomingRequests();
    expect(result[0].id).toBe("f1");
  });

  it("listOutgoingRequests fetches /friends/requests/outgoing", async () => {
    server.use(
      http.get("/api/friends/requests/outgoing", () =>
        HttpResponse.json([{ id: "f2", status: "pending" }]),
      ),
    );
    const result = await listOutgoingRequests();
    expect(result[0].id).toBe("f2");
  });

  it("acceptFriendRequest posts to /friends/requests/:id/accept", async () => {
    server.use(
      http.post("/api/friends/requests/f1/accept", () =>
        HttpResponse.json({ id: "f1", status: "accepted" }),
      ),
    );
    const result = await acceptFriendRequest("f1");
    expect(result.status).toBe("accepted");
  });

  it("declineFriendRequest posts to /friends/requests/:id/decline", async () => {
    server.use(
      http.post("/api/friends/requests/f1/decline", () =>
        HttpResponse.json({ id: "f1", status: "declined" }),
      ),
    );
    const result = await declineFriendRequest("f1");
    expect(result.status).toBe("declined");
  });

  it("removeFriend deletes /friends/:userId", async () => {
    server.use(http.delete("/api/friends/u2", () => new HttpResponse(null, { status: 204 })));
    await expect(removeFriend("u2")).resolves.toBeUndefined();
  });

  it("blockUser posts to /friends/:userId/block", async () => {
    server.use(
      http.post("/api/friends/u2/block", () =>
        HttpResponse.json({ id: "f3", status: "blocked" }, { status: 201 }),
      ),
    );
    const result = await blockUser("u2");
    expect(result.status).toBe("blocked");
  });

  it("unblockUser deletes /friends/:userId/block", async () => {
    server.use(http.delete("/api/friends/u2/block", () => new HttpResponse(null, { status: 204 })));
    await expect(unblockUser("u2")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/friends.test.ts`
Expected: FAIL — `Cannot find module './friends'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `lib/api/friends.ts`:

```typescript
import { apiClient } from "./client";
import type { FriendRequestResponse, FriendResponse, SendFriendRequestPayload } from "./types";

export async function listFriends(): Promise<FriendResponse[]> {
  const { data } = await apiClient.get("/friends/");
  return data;
}

export async function sendFriendRequest(
  payload: SendFriendRequestPayload,
): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post("/friends/requests", payload);
  return data;
}

export async function listIncomingRequests(): Promise<FriendRequestResponse[]> {
  const { data } = await apiClient.get("/friends/requests/incoming");
  return data;
}

export async function listOutgoingRequests(): Promise<FriendRequestResponse[]> {
  const { data } = await apiClient.get("/friends/requests/outgoing");
  return data;
}

export async function acceptFriendRequest(friendshipId: string): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post(`/friends/requests/${friendshipId}/accept`);
  return data;
}

export async function declineFriendRequest(friendshipId: string): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post(`/friends/requests/${friendshipId}/decline`);
  return data;
}

export async function removeFriend(userId: string): Promise<void> {
  await apiClient.delete(`/friends/${userId}`);
}

export async function blockUser(userId: string): Promise<FriendRequestResponse> {
  const { data } = await apiClient.post(`/friends/${userId}/block`);
  return data;
}

export async function unblockUser(userId: string): Promise<void> {
  await apiClient.delete(`/friends/${userId}/block`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/friends.test.ts`
Expected: PASS, all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/api/friends.ts lib/api/friends.test.ts
git commit -m "feat(friends): add friends API client"
```

---

### Task 3: Extend users API client with public-profile functions

**Files:**

- Modify: `lib/api/users.ts` (append two functions; existing `/users/me` functions untouched)
- Create: `lib/api/users.test.ts` (this file doesn't exist yet — write tests only for the two new functions; do not retroactively test the pre-existing `/users/me` functions, that's out of scope)

**Interfaces:**

- Consumes: `apiClient`; `PublicUserProfileResponse` (Task 1); `Page`, `ReviewResponse` (already defined in `lib/api/types.ts`).
- Produces: `getPublicProfile(username, params?)`, `getUserReviews(userId, params?)` — used by Task 5 (`useUserProfile.ts`).

- [ ] **Step 1: Write the failing test**

Create `lib/api/users.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { getPublicProfile, getUserReviews } from "./users";

describe("users API client (public profile)", () => {
  it("getPublicProfile fetches /users/:username", async () => {
    server.use(
      http.get("/api/users/bob", () =>
        HttpResponse.json({
          username: "bob",
          display_name: "Bob",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 20, offset: 0 },
        }),
      ),
    );
    const result = await getPublicProfile("bob");
    expect(result.username).toBe("bob");
  });

  it("getPublicProfile passes skip/limit as query params", async () => {
    server.use(
      http.get("/api/users/bob", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("skip")).toBe("10");
        expect(url.searchParams.get("limit")).toBe("5");
        return HttpResponse.json({
          username: "bob",
          display_name: "Bob",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 5, offset: 10 },
        });
      }),
    );
    await getPublicProfile("bob", { skip: 10, limit: 5 });
  });

  it("getUserReviews fetches /users/:userId/reviews", async () => {
    server.use(
      http.get("/api/users/u1/reviews", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    const result = await getUserReviews("u1");
    expect(result.items).toEqual([]);
  });

  it("getUserReviews passes sort/skip/limit as query params", async () => {
    server.use(
      http.get("/api/users/u1/reviews", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("sort")).toBe("rating");
        return HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 });
      }),
    );
    await getUserReviews("u1", { sort: "rating" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/users.test.ts`
Expected: FAIL — `getPublicProfile`/`getUserReviews` are not exported yet.

- [ ] **Step 3: Append the implementation**

Append to the end of `lib/api/users.ts` (keep all existing content above untouched):

```typescript
export async function getPublicProfile(
  username: string,
  params: { skip?: number; limit?: number } = {},
): Promise<PublicUserProfileResponse> {
  const { data } = await apiClient.get(`/users/${username}`, { params });
  return data;
}

export async function getUserReviews(
  userId: string,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
): Promise<Page<ReviewResponse>> {
  const { data } = await apiClient.get(`/users/${userId}/reviews`, { params });
  return data;
}
```

Add `PublicUserProfileResponse`, `Page`, `ReviewResponse`, `ReviewSort` to the existing `import type { ... } from "./types";` line at the top of `lib/api/users.ts` (extend the existing named import, don't add a second import statement).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/users.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/api/users.ts lib/api/users.test.ts
git commit -m "feat(friends): add public-profile functions to users API client"
```

---

### Task 4: useFriends TanStack Query hooks

**Files:**

- Create: `hooks/useFriends.ts`
- Create: `hooks/useFriends.test.tsx`

**Interfaces:**

- Consumes: all functions from Task 2's `lib/api/friends.ts`; types from Task 1.
- Produces: `useFriends()`, `useIncomingRequests()`, `useOutgoingRequests()`, `useSendFriendRequest()`, `useAcceptFriendRequest()`, `useDeclineFriendRequest()`, `useRemoveFriend()`, `useBlockUser()`, `useUnblockUser()`. Query keys: `["friends", "list"]`, `["friends", "requests", "incoming"]`, `["friends", "requests", "outgoing"]` — later tasks (components/pages) key their `invalidateQueries` reads off these exact keys. Invalidation rules (exact, later tasks depend on these):
  - `useSendFriendRequest` → invalidate `["friends", "requests", "outgoing"]`.
  - `useAcceptFriendRequest` → invalidate `["friends", "requests", "incoming"]` AND `["friends", "list"]`.
  - `useDeclineFriendRequest` → invalidate `["friends", "requests", "incoming"]`.
  - `useRemoveFriend` → invalidate `["friends", "list"]`.
  - `useBlockUser` → invalidate `["friends", "list"]`.
  - `useUnblockUser` → invalidate `["friends", "list"]`.

- [ ] **Step 1: Write the failing test**

Create `hooks/useFriends.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  useAcceptFriendRequest,
  useBlockUser,
  useDeclineFriendRequest,
  useFriends,
  useIncomingRequests,
  useOutgoingRequests,
  useRemoveFriend,
  useSendFriendRequest,
  useUnblockUser,
} from "./useFriends";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useFriends", () => {
  it("fetches the friend list", async () => {
    server.use(http.get("/api/friends/", () => HttpResponse.json([{ user_id: "u1" }])));
    const { result } = renderHook(() => useFriends(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].user_id).toBe("u1");
  });
});

describe("useIncomingRequests / useOutgoingRequests", () => {
  it("fetches incoming requests", async () => {
    server.use(
      http.get("/api/friends/requests/incoming", () => HttpResponse.json([{ id: "f1" }])),
    );
    const { result } = renderHook(() => useIncomingRequests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("f1");
  });

  it("fetches outgoing requests", async () => {
    server.use(
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([{ id: "f2" }])),
    );
    const { result } = renderHook(() => useOutgoingRequests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("f2");
  });
});

describe("useSendFriendRequest", () => {
  it("sends a friend request", async () => {
    server.use(
      http.post("/api/friends/requests", () =>
        HttpResponse.json({ id: "f1", status: "pending" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useSendFriendRequest(), { wrapper });
    result.current.mutate({ username: "bob" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAcceptFriendRequest", () => {
  it("accepts a request by friendship id", async () => {
    server.use(
      http.post("/api/friends/requests/f1/accept", () =>
        HttpResponse.json({ id: "f1", status: "accepted" }),
      ),
    );
    const { result } = renderHook(() => useAcceptFriendRequest(), { wrapper });
    result.current.mutate("f1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeclineFriendRequest", () => {
  it("declines a request by friendship id", async () => {
    server.use(
      http.post("/api/friends/requests/f1/decline", () =>
        HttpResponse.json({ id: "f1", status: "declined" }),
      ),
    );
    const { result } = renderHook(() => useDeclineFriendRequest(), { wrapper });
    result.current.mutate("f1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRemoveFriend", () => {
  it("removes a friend by user id", async () => {
    server.use(http.delete("/api/friends/u2", () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useRemoveFriend(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useBlockUser / useUnblockUser", () => {
  it("blocks a user", async () => {
    server.use(
      http.post("/api/friends/u2/block", () =>
        HttpResponse.json({ id: "f3", status: "blocked" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("unblocks a user", async () => {
    server.use(http.delete("/api/friends/u2/block", () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useUnblockUser(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useFriends.test.tsx`
Expected: FAIL — `Cannot find module './useFriends'`.

- [ ] **Step 3: Write the implementation**

Create `hooks/useFriends.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "@/lib/api/friends";
import type { SendFriendRequestPayload } from "@/lib/api/types";

export function useFriends() {
  return useQuery({
    queryKey: ["friends", "list"],
    queryFn: listFriends,
  });
}

export function useIncomingRequests() {
  return useQuery({
    queryKey: ["friends", "requests", "incoming"],
    queryFn: listIncomingRequests,
  });
}

export function useOutgoingRequests() {
  return useQuery({
    queryKey: ["friends", "requests", "outgoing"],
    queryFn: listOutgoingRequests,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendFriendRequestPayload) => sendFriendRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "requests", "outgoing"] });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => acceptFriendRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "requests", "incoming"] });
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => declineFriendRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "requests", "incoming"] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeFriend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useFriends.test.tsx`
Expected: PASS, all 8 describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFriends.ts hooks/useFriends.test.tsx
git commit -m "feat(friends): add useFriends TanStack Query hooks"
```

---

### Task 5: useUserProfile TanStack Query hooks

**Files:**

- Create: `hooks/useUserProfile.ts`
- Create: `hooks/useUserProfile.test.tsx`

**Interfaces:**

- Consumes: `getPublicProfile`, `getUserReviews` from Task 3's `lib/api/users.ts`.
- Produces: `usePublicProfile(username)`, `useUserReviews(userId, params?)`. Query keys: `["users", "profile", username]`, `["users", userId, "reviews", params]`.

- [ ] **Step 1: Write the failing test**

Create `hooks/useUserProfile.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { usePublicProfile, useUserReviews } from "./useUserProfile";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("usePublicProfile", () => {
  it("fetches a public profile by username", async () => {
    server.use(
      http.get("/api/users/bob", () =>
        HttpResponse.json({
          username: "bob",
          display_name: "Bob",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 20, offset: 0 },
        }),
      ),
    );
    const { result } = renderHook(() => usePublicProfile("bob"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.username).toBe("bob");
  });

  it("does not fetch when username is undefined", () => {
    const { result } = renderHook(() => usePublicProfile(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUserReviews", () => {
  it("fetches a user's reviews", async () => {
    server.use(
      http.get("/api/users/u1/reviews", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useUserReviews("u1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useUserProfile.test.tsx`
Expected: FAIL — `Cannot find module './useUserProfile'`.

- [ ] **Step 3: Write the implementation**

Create `hooks/useUserProfile.ts`:

```typescript
import { useQuery } from "@tanstack/react-query";
import { getPublicProfile, getUserReviews } from "@/lib/api/users";
import type { ReviewSort } from "@/lib/api/types";

export function usePublicProfile(username: string | undefined) {
  return useQuery({
    queryKey: ["users", "profile", username],
    queryFn: () => getPublicProfile(username as string),
    enabled: Boolean(username),
  });
}

export function useUserReviews(
  userId: string | undefined,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["users", userId, "reviews", params],
    queryFn: () => getUserReviews(userId as string, params),
    enabled: Boolean(userId),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useUserProfile.test.tsx`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add hooks/useUserProfile.ts hooks/useUserProfile.test.tsx
git commit -m "feat(friends): add useUserProfile TanStack Query hooks"
```

---

### Task 6: i18n strings for the friends domain

**Files:**

- Modify: `messages/en.json`
- Modify: `messages/uk.json`

**Interfaces:**

- Consumes: nothing.
- Produces: a top-level `"friends"` namespace, and a new `"friends"` key under the existing `"shell.nav"` object. Exact key paths listed in Step 1/2 — later tasks must use these paths verbatim.

- [ ] **Step 1: Add the `friends` namespace to `messages/en.json`**

Add a new top-level `"friends"` key (alongside the existing `"reading"` key):

```json
"friends": {
  "pageTitle": "Friends",
  "tabs": {
    "friends": "Friends",
    "requests": "Requests",
    "findPeople": "Find people"
  },
  "list": {
    "empty": "You haven't added any friends yet.",
    "since": "Friends since {date}",
    "viewProfile": "View profile",
    "unfriendAction": "Unfriend",
    "blockAction": "Block"
  },
  "requests": {
    "incomingTitle": "Incoming",
    "incomingEmpty": "No incoming friend requests.",
    "outgoingTitle": "Outgoing",
    "outgoingEmpty": "No outgoing friend requests.",
    "acceptAction": "Accept",
    "declineAction": "Decline",
    "pendingBadge": "Pending"
  },
  "findForm": {
    "label": "Username",
    "placeholder": "Enter an exact username",
    "submit": "Find",
    "submitting": "Searching...",
    "notFound": "No user found with that username.",
    "sendRequestAction": "Send friend request",
    "requestSent": "Friend request sent."
  },
  "unfriendDialog": {
    "title": "Unfriend this person?",
    "description": "You can send a new friend request later if you change your mind.",
    "confirm": "Unfriend"
  },
  "blockDialog": {
    "title": "Block this person?",
    "description": "Blocked users can't send you friend requests.",
    "confirm": "Block"
  },
  "profile": {
    "notAvailable": "This profile isn't available right now.",
    "friendActions": {
      "unfriend": "Unfriend",
      "block": "Block",
      "unblock": "Unblock"
    },
    "reviewsTitle": "Reviews",
    "reviewsEmpty": "No reviews yet."
  },
  "errors": {
    "generic": "Something went wrong. Please try again."
  }
}
```

- [ ] **Step 2: Add the matching `friends` namespace to `messages/uk.json`, and add the nav key to both files**

Add the same key structure to `messages/uk.json` with Ukrainian copy:

```json
"friends": {
  "pageTitle": "Друзі",
  "tabs": {
    "friends": "Друзі",
    "requests": "Запити",
    "findPeople": "Знайти людей"
  },
  "list": {
    "empty": "У вас поки немає друзів.",
    "since": "Друзі з {date}",
    "viewProfile": "Переглянути профіль",
    "unfriendAction": "Видалити з друзів",
    "blockAction": "Заблокувати"
  },
  "requests": {
    "incomingTitle": "Вхідні",
    "incomingEmpty": "Немає вхідних запитів у друзі.",
    "outgoingTitle": "Вихідні",
    "outgoingEmpty": "Немає вихідних запитів у друзі.",
    "acceptAction": "Прийняти",
    "declineAction": "Відхилити",
    "pendingBadge": "Очікує"
  },
  "findForm": {
    "label": "Ім'я користувача",
    "placeholder": "Введіть точне ім'я користувача",
    "submit": "Знайти",
    "submitting": "Пошук...",
    "notFound": "Користувача з таким ім'ям не знайдено.",
    "sendRequestAction": "Надіслати запит у друзі",
    "requestSent": "Запит у друзі надіслано."
  },
  "unfriendDialog": {
    "title": "Видалити цю людину з друзів?",
    "description": "Ви можете надіслати новий запит пізніше, якщо передумаєте.",
    "confirm": "Видалити з друзів"
  },
  "blockDialog": {
    "title": "Заблокувати цю людину?",
    "description": "Заблоковані користувачі не зможуть надсилати вам запити у друзі.",
    "confirm": "Заблокувати"
  },
  "profile": {
    "notAvailable": "Цей профіль зараз недоступний.",
    "friendActions": {
      "unfriend": "Видалити з друзів",
      "block": "Заблокувати",
      "unblock": "Розблокувати"
    },
    "reviewsTitle": "Рецензії",
    "reviewsEmpty": "Ще немає рецензій."
  },
  "errors": {
    "generic": "Щось пішло не так. Спробуйте ще раз."
  }
}
```

Then in **both** `messages/en.json` and `messages/uk.json`, add a `"friends"` key inside the existing `"shell": { "nav": { ... } }` object:

`messages/en.json`, inside `shell.nav`:

```json
"nav": {
  "browse": "Browse",
  "collections": "Collections",
  "reading": "Reading",
  "friends": "Friends"
}
```

`messages/uk.json`, inside `shell.nav` (same key, Ukrainian copy `"Друзі"`).

- [ ] **Step 3: Validate both JSON files parse**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json', 'utf8')); JSON.parse(require('fs').readFileSync('messages/uk.json', 'utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/uk.json
git commit -m "feat(friends): add friends domain i18n strings"
```

---

### Task 7: FriendListItem + UnfriendDialog + BlockUserDialog components

**Files:**

- Create: `components/friends/friend-list-item.tsx`
- Create: `components/friends/friend-list-item.stories.tsx`
- Create: `components/friends/friend-list-item.test.tsx`
- Create: `components/friends/unfriend-dialog.tsx`
- Create: `components/friends/unfriend-dialog.stories.tsx`
- Create: `components/friends/unfriend-dialog.test.tsx`
- Create: `components/friends/block-user-dialog.tsx`
- Create: `components/friends/block-user-dialog.stories.tsx`
- Create: `components/friends/block-user-dialog.test.tsx`

**Interfaces:**

- Consumes: `FriendResponse` (Task 1); `useRemoveFriend()`, `useBlockUser()` (Task 4); shadcn `Dialog` (`components/ui/dialog.tsx`), `Avatar` (`components/ui/avatar.tsx`), `Button`; `extractErrorMessage` from `@/lib/api/errors`. Dialog pattern follows `components/statuses/return-confirm-dialog.tsx` exactly (own `open`/`onOpenChange` props, mutation fired on confirm, `onOpenChange(false)` on success).
- Produces: `FriendListItem({ friend, onUnfriend, onBlock }: { friend: FriendResponse; onUnfriend: () => void; onBlock: () => void })`, `UnfriendDialog({ userId, open, onOpenChange }: { userId: string; open: boolean; onOpenChange: (open: boolean) => void })`, `BlockUserDialog({ userId, open, onOpenChange }: { userId: string; open: boolean; onOpenChange: (open: boolean) => void })`. All three consumed by Task 11 (friends list page).

- [ ] **Step 1: Write the failing tests**

Create `components/friends/friend-list-item.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { FriendListItem } from "./friend-list-item";
import type { FriendResponse } from "@/lib/api/types";

const friend: FriendResponse = {
  user_id: "u1",
  username: "bob",
  display_name: "Bob",
  avatar_url: null,
  since: "2026-01-01T00:00:00Z",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FriendListItem", () => {
  it("shows the friend's display name and username", () => {
    renderWithIntl(<FriendListItem friend={friend} onUnfriend={() => {}} onBlock={() => {}} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("calls onUnfriend and onBlock", async () => {
    const onUnfriend = vi.fn();
    const onBlock = vi.fn();
    renderWithIntl(<FriendListItem friend={friend} onUnfriend={onUnfriend} onBlock={onBlock} />);
    await userEvent.click(screen.getByRole("button", { name: "Unfriend" }));
    expect(onUnfriend).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Block" }));
    expect(onBlock).toHaveBeenCalledOnce();
  });
});
```

Create `components/friends/unfriend-dialog.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { UnfriendDialog } from "./unfriend-dialog";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("UnfriendDialog", () => {
  it("removes the friend on confirm and closes", async () => {
    const onOpenChange = vi.fn();
    server.use(http.delete("/api/friends/u1", () => new HttpResponse(null, { status: 204 })));
    renderWithProviders(<UnfriendDialog userId="u1" open={true} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Unfriend" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
```

Create `components/friends/block-user-dialog.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { BlockUserDialog } from "./block-user-dialog";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("BlockUserDialog", () => {
  it("blocks the user on confirm and closes", async () => {
    const onOpenChange = vi.fn();
    server.use(
      http.post("/api/friends/u1/block", () =>
        HttpResponse.json({ id: "f1", status: "blocked" }, { status: 201 }),
      ),
    );
    renderWithProviders(<BlockUserDialog userId="u1" open={true} onOpenChange={onOpenChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Block" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run components/friends/friend-list-item.test.tsx components/friends/unfriend-dialog.test.tsx components/friends/block-user-dialog.test.tsx`
Expected: FAIL — modules/directory don't exist yet.

- [ ] **Step 3: Write the implementations**

Create `components/friends/friend-list-item.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { FriendResponse } from "@/lib/api/types";

export function FriendListItem({
  friend,
  onUnfriend,
  onBlock,
}: {
  friend: FriendResponse;
  onUnfriend: () => void;
  onBlock: () => void;
}) {
  const t = useTranslations("friends.list");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar>
            {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={friend.display_name} />}
            <AvatarFallback>{friend.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">{friend.display_name}</p>
            <p className="text-muted-foreground text-xs">{friend.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onUnfriend}>
            {t("unfriendAction")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onBlock}>
            {t("blockAction")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

Create `components/friends/unfriend-dialog.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useRemoveFriend } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function UnfriendDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("friends.unfriendDialog");
  const removeFriend = useRemoveFriend();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {removeFriend.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(removeFriend.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={removeFriend.isPending}
            onClick={() => removeFriend.mutate(userId, { onSuccess: () => onOpenChange(false) })}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Create `components/friends/block-user-dialog.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { useBlockUser } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function BlockUserDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("friends.blockDialog");
  const blockUser = useBlockUser();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {blockUser.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(blockUser.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={blockUser.isPending}
            onClick={() => blockUser.mutate(userId, { onSuccess: () => onOpenChange(false) })}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run components/friends/friend-list-item.test.tsx components/friends/unfriend-dialog.test.tsx components/friends/block-user-dialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook stories**

Create `components/friends/friend-list-item.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FriendListItem } from "./friend-list-item";

const meta: Meta<typeof FriendListItem> = {
  title: "Friends/FriendListItem",
  component: FriendListItem,
};
export default meta;

type Story = StoryObj<typeof FriendListItem>;

export const Default: Story = {
  args: {
    friend: {
      user_id: "u1",
      username: "bob",
      display_name: "Bob Reader",
      avatar_url: null,
      since: new Date().toISOString(),
    },
    onUnfriend: () => {},
    onBlock: () => {},
  },
};
```

Create `components/friends/unfriend-dialog.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UnfriendDialog } from "./unfriend-dialog";

const meta: Meta<typeof UnfriendDialog> = {
  title: "Friends/UnfriendDialog",
  component: UnfriendDialog,
};
export default meta;

type Story = StoryObj<typeof UnfriendDialog>;

export const Open: Story = {
  args: { userId: "u1", open: true, onOpenChange: () => {} },
};
```

Create `components/friends/block-user-dialog.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BlockUserDialog } from "./block-user-dialog";

const meta: Meta<typeof BlockUserDialog> = {
  title: "Friends/BlockUserDialog",
  component: BlockUserDialog,
};
export default meta;

type Story = StoryObj<typeof BlockUserDialog>;

export const Open: Story = {
  args: { userId: "u1", open: true, onOpenChange: () => {} },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/friends/friend-list-item.tsx components/friends/friend-list-item.stories.tsx components/friends/friend-list-item.test.tsx components/friends/unfriend-dialog.tsx components/friends/unfriend-dialog.stories.tsx components/friends/unfriend-dialog.test.tsx components/friends/block-user-dialog.tsx components/friends/block-user-dialog.stories.tsx components/friends/block-user-dialog.test.tsx
git commit -m "feat(friends): add FriendListItem, UnfriendDialog, BlockUserDialog components"
```

---

### Task 8: FriendRequestCard component

**Files:**

- Create: `components/friends/friend-request-card.tsx`
- Create: `components/friends/friend-request-card.stories.tsx`
- Create: `components/friends/friend-request-card.test.tsx`

**Interfaces:**

- Consumes: `FriendRequestResponse` (Task 1); `Badge` (`components/ui/badge.tsx`).
- Produces: `FriendRequestCard({ request, direction, requesterLabel, onAccept, onDecline }: { request: FriendRequestResponse; direction: "incoming" | "outgoing"; requesterLabel: string; onAccept?: () => void; onDecline?: () => void })` — incoming renders Accept/Decline buttons (both callbacks required in that mode, wired by the caller); outgoing renders a "Pending" badge with no actions. `requesterLabel` is the display text for who the request is with (the caller resolves the id → username/display-name since `FriendRequestResponse` only carries raw ids — Task 11 passes this through). Consumed by Task 11 (friends list page).

- [ ] **Step 1: Write the failing test**

Create `components/friends/friend-request-card.test.tsx`:

```typescript
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { FriendRequestCard } from "./friend-request-card";
import type { FriendRequestResponse } from "@/lib/api/types";

const request: FriendRequestResponse = {
  id: "f1",
  requester_id: "u1",
  addressee_id: "u2",
  status: "pending",
  created_at: "2026-01-01T00:00:00Z",
  responded_at: null,
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FriendRequestCard", () => {
  it("shows Accept/Decline for incoming requests and calls the callbacks with the friendship id", async () => {
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    renderWithIntl(
      <FriendRequestCard
        request={request}
        direction="incoming"
        requesterLabel="bob"
        onAccept={onAccept}
        onDecline={onDecline}
      />,
    );
    expect(screen.getByText("bob")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("shows a pending badge with no actions for outgoing requests", () => {
    renderWithIntl(
      <FriendRequestCard request={request} direction="outgoing" requesterLabel="carol" />,
    );
    expect(screen.getByText("carol")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/friends/friend-request-card.test.tsx`
Expected: FAIL — `Cannot find module './friend-request-card'`.

- [ ] **Step 3: Write the implementation**

Create `components/friends/friend-request-card.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FriendRequestResponse } from "@/lib/api/types";

export function FriendRequestCard({
  request,
  direction,
  requesterLabel,
  onAccept,
  onDecline,
}: {
  request: FriendRequestResponse;
  direction: "incoming" | "outgoing";
  requesterLabel: string;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const t = useTranslations("friends.requests");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{requesterLabel}</p>
        {direction === "incoming" ? (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAccept}>
              {t("acceptAction")}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDecline}>
              {t("declineAction")}
            </Button>
          </div>
        ) : (
          <Badge variant="secondary">{t("pendingBadge")}</Badge>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/friends/friend-request-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook story**

Create `components/friends/friend-request-card.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FriendRequestCard } from "./friend-request-card";

const meta: Meta<typeof FriendRequestCard> = {
  title: "Friends/FriendRequestCard",
  component: FriendRequestCard,
};
export default meta;

type Story = StoryObj<typeof FriendRequestCard>;

const request = {
  id: "f1",
  requester_id: "u1",
  addressee_id: "u2",
  status: "pending" as const,
  created_at: new Date().toISOString(),
  responded_at: null,
};

export const Incoming: Story = {
  args: {
    request,
    direction: "incoming",
    requesterLabel: "bob",
    onAccept: () => {},
    onDecline: () => {},
  },
};

export const Outgoing: Story = {
  args: { request, direction: "outgoing", requesterLabel: "carol" },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/friends/friend-request-card.tsx components/friends/friend-request-card.stories.tsx components/friends/friend-request-card.test.tsx
git commit -m "feat(friends): add FriendRequestCard component"
```

---

### Task 9: PublicProfileCard component

**Files:**

- Create: `components/friends/public-profile-card.tsx`
- Create: `components/friends/public-profile-card.stories.tsx`
- Create: `components/friends/public-profile-card.test.tsx`

**Interfaces:**

- Consumes: `PublicUserProfileResponse` (Task 1); `Avatar`.
- Produces: `PublicProfileCard({ profile, action }: { profile: PublicUserProfileResponse; action?: React.ReactNode })` — `action` is an optional slot for a caller-supplied button (e.g. "Send friend request" in Task 10's `FindUserForm`, or nothing when embedded in the full profile page in Task 12). Consumed by Task 10 and Task 12.

- [ ] **Step 1: Write the failing test**

Create `components/friends/public-profile-card.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicProfileCard } from "./public-profile-card";
import type { PublicUserProfileResponse } from "@/lib/api/types";

const profile: PublicUserProfileResponse = {
  username: "bob",
  display_name: "Bob Reader",
  bio: "I read a lot.",
  avatar_url: null,
  collections: { items: [], total: 0, limit: 20, offset: 0 },
};

describe("PublicProfileCard", () => {
  it("shows display name, username, and bio", () => {
    render(<PublicProfileCard profile={profile} />);
    expect(screen.getByText("Bob Reader")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("I read a lot.")).toBeInTheDocument();
  });

  it("renders the action slot when provided", () => {
    render(<PublicProfileCard profile={profile} action={<button>Send friend request</button>} />);
    expect(screen.getByRole("button", { name: "Send friend request" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/friends/public-profile-card.test.tsx`
Expected: FAIL — `Cannot find module './public-profile-card'`.

- [ ] **Step 3: Write the implementation**

Create `components/friends/public-profile-card.tsx`:

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PublicUserProfileResponse } from "@/lib/api/types";

export function PublicProfileCard({
  profile,
  action,
}: {
  profile: PublicUserProfileResponse;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar>
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.display_name} />}
            <AvatarFallback>{profile.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">{profile.display_name}</p>
            <p className="text-muted-foreground text-xs">{profile.username}</p>
            {profile.bio && <p className="text-muted-foreground text-xs">{profile.bio}</p>}
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/friends/public-profile-card.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook story**

Create `components/friends/public-profile-card.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PublicProfileCard } from "./public-profile-card";

const meta: Meta<typeof PublicProfileCard> = {
  title: "Friends/PublicProfileCard",
  component: PublicProfileCard,
};
export default meta;

type Story = StoryObj<typeof PublicProfileCard>;

const profile = {
  username: "bob",
  display_name: "Bob Reader",
  bio: "I read a lot.",
  avatar_url: null,
  collections: { items: [], total: 0, limit: 20, offset: 0 },
};

export const Default: Story = {
  args: { profile },
};

export const WithAction: Story = {
  args: { profile, action: <button>Send friend request</button> },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/friends/public-profile-card.tsx components/friends/public-profile-card.stories.tsx components/friends/public-profile-card.test.tsx
git commit -m "feat(friends): add PublicProfileCard component"
```

---

### Task 10: FindUserForm component

**Files:**

- Create: `components/friends/find-user-form.tsx`
- Create: `components/friends/find-user-form.stories.tsx`
- Create: `components/friends/find-user-form.test.tsx`

**Interfaces:**

- Consumes: `usePublicProfile()` (Task 5, called lazily — only after submit, via the `enabled` gate keyed on a submitted-username state var, not on every keystroke); `useSendFriendRequest()` (Task 4); `PublicProfileCard` (Task 9); `extractErrorMessage`.
- Produces: `FindUserForm()` (no props — self-contained) — consumed by Task 11 (friends list page, "Find people" tab).

- [ ] **Step 1: Write the failing test**

Create `components/friends/find-user-form.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { FindUserForm } from "./find-user-form";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("FindUserForm", () => {
  it("shows a not-found message on 404", async () => {
    server.use(http.get("/api/users/ghost", () => new HttpResponse(null, { status: 404 })));
    renderWithProviders(<FindUserForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ghost");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await waitFor(() =>
      expect(screen.getByText("No user found with that username.")).toBeInTheDocument(),
    );
  });

  it("shows a profile preview with a send-request button on success", async () => {
    server.use(
      http.get("/api/users/bob", () =>
        HttpResponse.json({
          username: "bob",
          display_name: "Bob Reader",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 20, offset: 0 },
        }),
      ),
      http.post("/api/friends/requests", () =>
        HttpResponse.json({ id: "f1", status: "pending" }, { status: 201 }),
      ),
    );
    renderWithProviders(<FindUserForm />);
    await userEvent.type(screen.getByLabelText("Username"), "bob");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await waitFor(() => expect(screen.getByText("Bob Reader")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Send friend request" }));
    await waitFor(() => expect(screen.getByText("Friend request sent.")).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/friends/find-user-form.test.tsx`
Expected: FAIL — `Cannot find module './find-user-form'`.

- [ ] **Step 3: Write the implementation**

Create `components/friends/find-user-form.tsx`:

```typescript
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePublicProfile } from "@/hooks/useUserProfile";
import { useSendFriendRequest } from "@/hooks/useFriends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicProfileCard } from "./public-profile-card";
import { extractErrorMessage } from "@/lib/api/errors";

export function FindUserForm() {
  const t = useTranslations("friends.findForm");
  const [username, setUsername] = React.useState("");
  const [submittedUsername, setSubmittedUsername] = React.useState<string | undefined>(undefined);

  const profile = usePublicProfile(submittedUsername);
  const sendRequest = useSendFriendRequest();

  const notFound = profile.isError && (profile.error as { response?: { status?: number } })?.response?.status === 404;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendRequest.reset();
    setSubmittedUsername(username);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="find-username" className="text-sm font-medium">
          {t("label")}
        </label>
        <Input
          id="find-username"
          placeholder={t("placeholder")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={profile.isFetching || !username}>
        {profile.isFetching ? t("submitting") : t("submit")}
      </Button>
      {notFound && <p className="text-muted-foreground text-sm">{t("notFound")}</p>}
      {profile.isSuccess && profile.data && (
        <PublicProfileCard
          profile={profile.data}
          action={
            sendRequest.isSuccess ? (
              <p className="text-muted-foreground text-sm">{t("requestSent")}</p>
            ) : (
              <Button
                size="sm"
                disabled={sendRequest.isPending}
                onClick={() => sendRequest.mutate({ username: profile.data.username })}
              >
                {t("sendRequestAction")}
              </Button>
            )
          }
        />
      )}
      {sendRequest.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(sendRequest.error)}</p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/friends/find-user-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Add the Storybook story**

Create `components/friends/find-user-form.stories.tsx`:

```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FindUserForm } from "./find-user-form";

const meta: Meta<typeof FindUserForm> = {
  title: "Friends/FindUserForm",
  component: FindUserForm,
};
export default meta;

type Story = StoryObj<typeof FindUserForm>;

export const Default: Story = {};
```

- [ ] **Step 6: Commit**

```bash
git add components/friends/find-user-form.tsx components/friends/find-user-form.stories.tsx components/friends/find-user-form.test.tsx
git commit -m "feat(friends): add FindUserForm component"
```

---

### Task 11: Friends list page (`/friends`) with tabs

**Files:**

- Create: `app/(app)/friends/page.tsx`
- Create: `app/(app)/friends/page.test.tsx`

**Interfaces:**

- Consumes: `useFriends()`, `useIncomingRequests()`, `useOutgoingRequests()`, `useAcceptFriendRequest()`, `useDeclineFriendRequest()` (Task 4); `FriendListItem`, `UnfriendDialog`, `BlockUserDialog`, `FriendRequestCard`, `FindUserForm` (Tasks 7-10); shadcn `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`; `Skeleton` (Block 0 kit); `Link` from `next/link` (for "View profile" → `/friends/[userId]`).
- Produces: default export page component at route `/friends`. No other task consumes this file (leaf page).
- Note on `requesterLabel` for `FriendRequestCard`: `FriendRequestResponse` only carries `requester_id`/`addressee_id`, not usernames. This page has no batch user-lookup endpoint available (see spec's "Gap" section), so it displays the raw id truncated (`requester_id.slice(0, 8)`) as the label for both incoming and outgoing cards. This is a known display limitation, not a bug — flag it as a candidate follow-up for Block 8's API audit (a batch user-lookup or an expanded `FriendRequestResponse` with embedded username would remove the need for this).

- [ ] **Step 1: Write the failing test**

Create `app/(app)/friends/page.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import FriendsPage from "./page";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("FriendsPage", () => {
  it("shows the friends tab by default with the friend list", async () => {
    server.use(
      http.get("/api/friends/", () =>
        HttpResponse.json([
          { user_id: "u1", username: "bob", display_name: "Bob", avatar_url: null, since: "2026-01-01T00:00:00Z" },
        ]),
      ),
      http.get("/api/friends/requests/incoming", () => HttpResponse.json([])),
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([])),
    );
    renderWithProviders(<FriendsPage />);
    await waitFor(() => expect(screen.getByText("Bob")).toBeInTheDocument());
  });

  it("switches to the requests tab and accepts an incoming request", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([])),
      http.get("/api/friends/requests/incoming", () =>
        HttpResponse.json([
          { id: "f1", requester_id: "u2", addressee_id: "u1", status: "pending", created_at: "now", responded_at: null },
        ]),
      ),
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([])),
      http.post("/api/friends/requests/f1/accept", () =>
        HttpResponse.json({ id: "f1", status: "accepted" }),
      ),
    );
    renderWithProviders(<FriendsPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Requests" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
  });

  it("switches to the find-people tab and shows the form", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([])),
      http.get("/api/friends/requests/incoming", () => HttpResponse.json([])),
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([])),
    );
    renderWithProviders(<FriendsPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Find people" }));
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run app/\(app\)/friends/page.test.tsx`
Expected: FAIL — `app/(app)/friends/page.tsx` doesn't exist yet (only `[userId]/page.tsx` exists in that directory).

- [ ] **Step 3: Write the implementation**

Create `app/(app)/friends/page.tsx`:

```typescript
"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useFriends,
  useIncomingRequests,
  useOutgoingRequests,
} from "@/hooks/useFriends";
import { FriendListItem } from "@/components/friends/friend-list-item";
import { FriendRequestCard } from "@/components/friends/friend-request-card";
import { FindUserForm } from "@/components/friends/find-user-form";
import { UnfriendDialog } from "@/components/friends/unfriend-dialog";
import { BlockUserDialog } from "@/components/friends/block-user-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

export default function FriendsPage() {
  const t = useTranslations("friends");
  const tRequests = useTranslations("friends.requests");
  const tList = useTranslations("friends.list");

  const friends = useFriends();
  const incoming = useIncomingRequests();
  const outgoing = useOutgoingRequests();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  const [unfriendTarget, setUnfriendTarget] = React.useState<string | null>(null);
  const [blockTarget, setBlockTarget] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("pageTitle")}</h1>
      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">{t("tabs.friends")}</TabsTrigger>
          <TabsTrigger value="requests">{t("tabs.requests")}</TabsTrigger>
          <TabsTrigger value="findPeople">{t("tabs.findPeople")}</TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          {friends.isPending && <Skeleton className="h-40 w-full" />}
          {!friends.isPending && friends.data?.length === 0 && (
            <p className="text-muted-foreground">{tList("empty")}</p>
          )}
          <div className="flex flex-col gap-2">
            {friends.data?.map((friend) => (
              <div key={friend.user_id} className="flex flex-col gap-1">
                <FriendListItem
                  friend={friend}
                  onUnfriend={() => setUnfriendTarget(friend.user_id)}
                  onBlock={() => setBlockTarget(friend.user_id)}
                />
                <Link
                  href={`/friends/${friend.user_id}`}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  {tList("viewProfile")}
                </Link>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">{tRequests("incomingTitle")}</h2>
              {incoming.isPending && <Skeleton className="h-24 w-full" />}
              {!incoming.isPending && incoming.data?.length === 0 && (
                <p className="text-muted-foreground text-sm">{tRequests("incomingEmpty")}</p>
              )}
              {incoming.data?.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  direction="incoming"
                  requesterLabel={request.requester_id.slice(0, 8)}
                  onAccept={() => acceptRequest.mutate(request.id)}
                  onDecline={() => declineRequest.mutate(request.id)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">{tRequests("outgoingTitle")}</h2>
              {outgoing.isPending && <Skeleton className="h-24 w-full" />}
              {!outgoing.isPending && outgoing.data?.length === 0 && (
                <p className="text-muted-foreground text-sm">{tRequests("outgoingEmpty")}</p>
              )}
              {outgoing.data?.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  direction="outgoing"
                  requesterLabel={request.addressee_id.slice(0, 8)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="findPeople">
          <FindUserForm />
        </TabsContent>
      </Tabs>

      {unfriendTarget && (
        <UnfriendDialog
          userId={unfriendTarget}
          open={Boolean(unfriendTarget)}
          onOpenChange={(open) => !open && setUnfriendTarget(null)}
        />
      )}
      {blockTarget && (
        <BlockUserDialog
          userId={blockTarget}
          open={Boolean(blockTarget)}
          onOpenChange={(open) => !open && setBlockTarget(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes, then lint**

Run: `pnpm vitest run app/\(app\)/friends/page.test.tsx`
Expected: PASS, all 3 tests green.

Run: `pnpm lint app/\(app\)/friends/page.tsx`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/friends/page.tsx app/\(app\)/friends/page.test.tsx
git commit -m "feat(friends): add friends list page with Friends/Requests/Find people tabs"
```

---

### Task 12: Extend `[userId]/page.tsx` into a full friend/public profile page

**Files:**

- Modify: `app/(app)/friends/[userId]/page.tsx` (add a profile header + friend actions above the existing collections/library sections; do not alter the existing collections/library JSX blocks)
- Modify: `app/(app)/friends/[userId]/page.test.tsx` if it exists, else create it (check first — Block 3's commit `744bffb` may not have added a test file for this page)

**Interfaces:**

- Consumes: `useFriends()` (Task 4, to determine if the viewed user is already a friend — matched by comparing `userId` against each `FriendResponse.user_id`); `usePublicProfile(username)` is NOT used here because the route param is `userId` not `username` and there is no `GET /users/{user_id}` — instead this task adds a lightweight local profile summary by reusing `FriendResponse` data when the viewed user is already a friend (avatar/display name/username all present on `FriendResponse`); when not yet a friend, render only the "Add friend" action without a profile header (no id→username lookup endpoint exists — same API gap as Task 11). `UnfriendDialog`, `BlockUserDialog` (Task 7).
- Produces: extended default export at route `/friends/[userId]`. Leaf page, nothing consumes it.

- [ ] **Step 1: Check for an existing test file, then write/extend the failing test**

Run: `ls "app/(app)/friends/[userId]/page.test.tsx" 2>&1` — if it exists, read it first and add new test cases to it rather than overwriting; if not, create it fresh with the content below (it should include the pre-existing shelf-rendering assertions too, reconstructed from the current page implementation, plus the new header/action assertions).

Create/extend `app/(app)/friends/[userId]/page.test.tsx`:

```typescript
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import FriendShelfPage from "./page";

function renderWithProviders(userId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <FriendShelfPage params={Promise.resolve({ userId })} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("FriendShelfPage (profile header)", () => {
  it("shows friend header with Unfriend/Block actions when already friends", async () => {
    server.use(
      http.get("/api/friends/", () =>
        HttpResponse.json([
          { user_id: "u1", username: "bob", display_name: "Bob Reader", avatar_url: null, since: "2026-01-01T00:00:00Z" },
        ]),
      ),
      http.get("/api/friends/u1/collections", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.get("/api/friends/u1/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    renderWithProviders("u1");
    await waitFor(() => expect(screen.getByText("Bob Reader")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Unfriend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Block" })).toBeInTheDocument();
  });

  it("shows no friend header when the viewed user is not yet a friend", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([])),
      http.get("/api/friends/u2/collections", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.get("/api/friends/u2/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    renderWithProviders("u2");
    await waitFor(() => expect(screen.queryByRole("button", { name: "Unfriend" })).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify the new cases fail**

Run: `pnpm vitest run "app/(app)/friends/[userId]/page.test.tsx"`
Expected: FAIL on the two new cases above (header/actions not rendered yet); pre-existing cases (if the file already had them) continue to pass.

- [ ] **Step 3: Extend the implementation**

Modify `app/(app)/friends/[userId]/page.tsx` — add imports and a header section above the existing `<section>` blocks, keep everything below unchanged:

```typescript
"use client";

import * as React from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import { useFriendCollections, useFriendLibrary } from "@/hooks/useFriendContent";
import { useFriends } from "@/hooks/useFriends";
import { CollectionCard } from "@/components/collections/collection-card";
import { StatusListItem } from "@/components/statuses/status-list-item";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UnfriendDialog } from "@/components/friends/unfriend-dialog";
import { BlockUserDialog } from "@/components/friends/block-user-dialog";

export default function FriendShelfPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const t = useTranslations("collections");
  const statusesT = useTranslations("statuses");
  const commonT = useTranslations("common");
  const friendsT = useTranslations("friends.profile.friendActions");

  const friends = useFriends();
  const friend = friends.data?.find((f) => f.user_id === userId);

  const [unfriendOpen, setUnfriendOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);

  const {
    data: collectionsPage,
    isPending: collectionsPending,
    isError: collectionsError,
  } = useFriendCollections(userId);
  const {
    data: libraryPage,
    isPending: libraryPending,
    isError: libraryError,
  } = useFriendLibrary(userId);

  return (
    <div className="flex flex-col gap-8">
      {friend && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar>
                {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={friend.display_name} />}
                <AvatarFallback>{friend.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <p className="text-lg font-medium">{friend.display_name}</p>
                <p className="text-muted-foreground text-sm">{friend.username}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setUnfriendOpen(true)}>
                {friendsT("unfriend")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBlockOpen(true)}>
                {friendsT("block")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("pageTitle")}</h2>
        {collectionsPending && <Skeleton className="h-40 w-full" />}
        {collectionsError && <p className="text-muted-foreground">{commonT("notAvailable")}</p>}
        {!collectionsPending && !collectionsError && collectionsPage?.items.length === 0 && (
          <p className="text-muted-foreground">{t("empty")}</p>
        )}
        {!collectionsPending &&
          !collectionsError &&
          collectionsPage &&
          collectionsPage.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {collectionsPage.items.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{statusesT("tabs.library")}</h2>
        {libraryPending && <Skeleton className="h-40 w-full" />}
        {libraryError && <p className="text-muted-foreground">{commonT("notAvailable")}</p>}
        {!libraryPending && !libraryError && libraryPage?.items.length === 0 && (
          <p className="text-muted-foreground">{statusesT("empty")}</p>
        )}
        {!libraryPending && !libraryError && libraryPage && libraryPage.items.length > 0 && (
          <div className="flex flex-col gap-2">
            {libraryPage.items.map((status) => (
              <StatusListItem
                key={status.id}
                status={status}
                onChangeStatus={() => {}}
                onLend={() => {}}
                onReturn={() => {}}
              />
            ))}
          </div>
        )}
      </section>

      <UnfriendDialog userId={userId} open={unfriendOpen} onOpenChange={setUnfriendOpen} />
      <BlockUserDialog userId={userId} open={blockOpen} onOpenChange={setBlockOpen} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes, then lint**

Run: `pnpm vitest run "app/(app)/friends/[userId]/page.test.tsx"`
Expected: PASS, including pre-existing shelf-rendering cases.

Run: `pnpm lint "app/(app)/friends/[userId]/page.tsx"`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/friends/[userId]/page.tsx" "app/(app)/friends/[userId]/page.test.tsx"
git commit -m "feat(friends): add profile header and friend actions to friend shelf page"
```

---

### Task 13: Header nav "Friends" link

**Files:**

- Modify: `components/shell/header.tsx`
- Modify: `components/shell/header.test.tsx`

**Interfaces:**

- Consumes: `tShell` (`useTranslations("shell")`, already used in this file) reading the new `nav.friends` key added in Task 6.
- Produces: nothing consumed by other tasks (leaf UI change).

- [ ] **Step 1: Extend the failing test**

In `components/shell/header.test.tsx`, find the existing test `"renders nav links for Browse, Collections, and Reading"` and update its name/assertions to also check the Friends link:

```typescript
it("renders nav links for Browse, Collections, Reading, and Friends", () => {
  // ...existing render setup above stays as-is...
  expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute("href", "/friends");
});
```

(Read the file first to see the exact existing test body and insert the new assertion alongside the existing Browse/Collections/Reading ones, in the same `it` block — don't duplicate the render setup in a new test.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run components/shell/header.test.tsx`
Expected: FAIL — no "Friends" link rendered yet.

- [ ] **Step 3: Add the nav link**

In `components/shell/header.tsx`, inside the `<nav>` block (after the existing Reading link), add:

```typescript
<Link href="/friends" className="text-muted-foreground hover:text-foreground text-sm">
  {tShell("nav.friends")}
</Link>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run components/shell/header.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/shell/header.tsx components/shell/header.test.tsx
git commit -m "feat(friends): add Friends nav link to header"
```

---

### Task 14: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Run the full lint**

Run: `pnpm lint`
Expected: no errors across the whole repo.

- [ ] **Step 2: Run the full typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, including every test file created/modified in Tasks 1-13.

- [ ] **Step 4: Run the production build**

Run: `pnpm build`
Expected: build succeeds with no type or bundling errors, including the new `/friends` and `/friends/[userId]` routes.

- [ ] **Step 5: Run format check**

Run: `pnpm format:check`
Expected: passes; if not, run `pnpm prettier --write` on the changed files and re-commit.

- [ ] **Step 6: Manual smoke test**

Run: `pnpm dev`, sign in as a test user, navigate to `/friends`:

- Friends tab shows the friend list (or empty state).
- Requests tab shows incoming (with Accept/Decline) and outgoing (with Pending badge).
- Find people tab: search a real username, confirm not-found and found states both render, send a friend request.
- Visit `/friends/[userId]` for an existing friend: confirm the header shows with Unfriend/Block actions, and the collections/library shelf below still renders as before.
- Confirm the "Friends" link appears in the header nav and routes to `/friends`.

- [ ] **Step 7: No commit for this task** — purely verification. If any step fails, spawn a fix subtask targeting the specific failure (re-enter the tiered-execution dispatch step), then re-run this gate.

---

### Task 15: Playwright e2e — two-user friend request happy path

**Files:**

- Create: `e2e/friends.spec.ts`

**Interfaces:**

- Consumes: `test`, `expect` from `./fixtures` (same pattern as `e2e/auth.spec.ts`); no fixture seed data needed — this test registers its own two users via the `/register` flow, same as `auth.spec.ts` does for one user.
- Produces: nothing consumed by other tasks (leaf e2e test).

- [ ] **Step 1: Write the e2e test**

Create `e2e/friends.spec.ts`:

```typescript
// e2e/friends.spec.ts
import { test, expect } from "./fixtures";

test("user A sends a friend request, user B accepts, both see each other as friends", async ({
  browser,
}) => {
  const suffix = Date.now();
  const userA = {
    email: `e2e-a-${suffix}@example.com`,
    username: `e2ea${suffix}`,
    password: "password123",
  };
  const userB = {
    email: `e2e-b-${suffix}@example.com`,
    username: `e2eb${suffix}`,
    password: "password123",
  };

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await pageA.goto("/register");
  await pageA.getByLabel("Email").fill(userA.email);
  await pageA.getByLabel("Username").fill(userA.username);
  await pageA.getByLabel("Display name").fill("E2E User A");
  await pageA.getByLabel("Password").fill(userA.password);
  await pageA.getByRole("button", { name: "Create account" }).click();
  await expect(pageA).toHaveURL(/\/profile/);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto("/register");
  await pageB.getByLabel("Email").fill(userB.email);
  await pageB.getByLabel("Username").fill(userB.username);
  await pageB.getByLabel("Display name").fill("E2E User B");
  await pageB.getByLabel("Password").fill(userB.password);
  await pageB.getByRole("button", { name: "Create account" }).click();
  await expect(pageB).toHaveURL(/\/profile/);

  // User A sends a friend request to User B via the Find people tab
  await pageA.goto("/friends");
  await pageA.getByRole("tab", { name: "Find people" }).click();
  await pageA.getByLabel("Username").fill(userB.username);
  await pageA.getByRole("button", { name: "Find" }).click();
  await expect(pageA.getByText("E2E User B")).toBeVisible();
  await pageA.getByRole("button", { name: "Send friend request" }).click();
  await expect(pageA.getByText("Friend request sent.")).toBeVisible();

  // User B accepts from the Requests tab
  await pageB.goto("/friends");
  await pageB.getByRole("tab", { name: "Requests" }).click();
  await expect(pageB.getByRole("button", { name: "Accept" })).toBeVisible();
  await pageB.getByRole("button", { name: "Accept" }).click();

  // Both now see each other in their Friends tab
  await pageB.getByRole("tab", { name: "Friends" }).click();
  await expect(pageB.getByText("E2E User A")).toBeVisible();

  await pageA.goto("/friends");
  await expect(pageA.getByText("E2E User B")).toBeVisible();

  // User A views User B's profile page and sees the profile header
  await pageA.getByRole("link", { name: "View profile" }).click();
  await expect(pageA.getByText("E2E User B")).toBeVisible();
  await expect(pageA.getByRole("button", { name: "Unfriend" })).toBeVisible();

  await contextA.close();
  await contextB.close();
});
```

- [ ] **Step 2: Run the e2e test**

Run: `pnpm playwright test e2e/friends.spec.ts`
Expected: PASS against a running dev server + live API (per `playwright.config.ts`'s `webServer` setup, same as the other `e2e/*.spec.ts` files — this test creates its own two users, no seed data required, matching `auth.spec.ts`'s self-contained pattern).

- [ ] **Step 3: Commit**

```bash
git add e2e/friends.spec.ts
git commit -m "test(friends): add e2e happy-path test for friend request flow"
```
