# Block 3 (Collections & Reviews) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Collections & Reviews block — user-owned collections CRUD with drag-to-reorder items, review CRUD (replacing Block 2's read-only review list), a personal book-status feed (library/wishlist/lent-out/borrowed) with lend/return actions, friend-shelf read-only viewing, and share-to-chat entry points.

**Architecture:** Standard per-block shape (`lib/api/<domain>.ts` → `hooks/use<Domain>.ts` → `components/<domain>/` → `app/(app)/<domain>/...`), split across four API domains (`collections`, `reviews`, `statuses`, `share`) plus one read-only cross-cutting module (`friends-content`). Reviews retires and replaces Block 2's `components/catalog/review-list.tsx`. Reordering uses `@dnd-kit/core` (new dependency).

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, axios, next-intl, shadcn/ui (Radix via `@base-ui/react`), Tailwind, Vitest + RTL + msw, Playwright, `@dnd-kit/core` (new).

## Global Constraints

- Package manager: pnpm. Scripts: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`.
- Never merge/push directly to `main` — this whole block lands via one PR from a feature branch (e.g. `block-3-collections-reviews`).
- API base path `/api/v1`; axios client already proxies through `/api` (`lib/api/client.ts`) — new domain files call relative paths like `apiClient.get("/collections")`.
- Error shape is uniform: `{ detail: string }` for simple errors, `{ detail: [{msg, loc}] }` for 422 validation errors. Use `extractErrorMessage` from `lib/api/errors.ts` in every form/mutation error display.
- **Exactly-one-of `book_id`/`release_id`** is enforced server-side (422, `loc: ["body"]`, not field-attributable) on `AddCollectionItemSchema`, `CreateReviewSchema`, `CreateBookStatusSchema`. Every form submitting one of these must (a) let the user pick book OR release, never both/neither, via UI (e.g. radio/toggle + conditional select), and (b) render the 422 as a general form-level alert (not a per-field error) if it slips through.
- `GET /me/statuses/` returns a **plain array** `BookStatusResponse[]`, NOT `Page<BookStatusResponse>` — do not wrap it in `Page` typing. The four named views (`me/library`, `me/wishlist`, `me/lent-out`, `me/borrowed`) DO return `Page<BookStatusResponse>`.
- `POST /collections/{id}/reorder` and item DELETE both return `204` (no body) — client functions return `Promise<void>`.
- Share endpoints (`POST /share/book/{id}`, `POST /share/collection/{id}`) are fire-and-toast only — no cache invalidation, no navigation to chat (Block 6 doesn't exist yet).
- Every component gets a Storybook story (default, loading, error, empty states as applicable) and a Vitest/RTL test.
- Every hook gets a Vitest test against a mocked API (msw), covering success + error branches.
- All new UI strings go through `useTranslations()` from next-intl — no hardcoded UI copy in JSX. Add keys to both `messages/en.json` and `messages/uk.json` in the same step that introduces them.
- `proxy.ts` `PROTECTED_PATHS` needs `/collections` and `/library` added (new authed-only route segments this block introduces).

---

## Phase 1 — API Clients & Types

### Task 1: Add Collections/Reviews/Statuses/Share domain types

**Files:**

- Modify: `lib/api/types.ts` (append new sections at end of file)

**Interfaces:**

- Produces: `CollectionResponse`, `CollectionDetailResponse`, `CollectionItemResponse`, `CreateCollectionPayload`, `UpdateCollectionPayload`, `AddCollectionItemPayload`, `UpdateCollectionItemPayload`, `CollectionListParams`, `CreateReviewPayload`, `UpdateReviewPayload`, `BookStatusKind`, `BookStatusResponse`, `CreateStatusPayload`, `UpdateStatusPayload`, `LendStatusPayload`, `StatusViewParams`, `ChatMessageResponse`, `SharePayload` — used by every subsequent task in this plan.

- [ ] **Step 1: Append the new type sections**

```ts
// --- Collections domain types ---

export interface CollectionResponse {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionItemResponse {
  id: string;
  collection_id: string;
  book_id: string | null;
  release_id: string | null;
  position: number;
  added_at: string;
  note: string | null;
}

export interface CollectionDetailResponse extends CollectionResponse {
  items: Page<CollectionItemResponse>;
}

export interface CreateCollectionPayload {
  name: string;
  description?: string | null;
  is_public?: boolean;
  cover_image_url?: string | null;
}

export interface UpdateCollectionPayload {
  name?: string;
  description?: string | null;
  is_public?: boolean;
  cover_image_url?: string | null;
}

export interface AddCollectionItemPayload {
  book_id?: string | null;
  release_id?: string | null;
  note?: string | null;
}

export interface UpdateCollectionItemPayload {
  position?: number;
  note?: string | null;
}

export interface CollectionListParams {
  skip?: number;
  limit?: number;
}

export interface CollectionItemListParams {
  items_skip?: number;
  items_limit?: number;
}

// --- Reviews domain types (extends Block 2's ReviewResponse) ---

export interface CreateReviewPayload {
  book_id?: string | null;
  release_id?: string | null;
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  is_public?: boolean;
  contains_spoilers?: boolean;
}

export interface UpdateReviewPayload {
  rating?: number | null;
  title?: string | null;
  body?: string | null;
  is_public?: boolean;
  contains_spoilers?: boolean;
}

// --- Statuses domain types ---

export type BookStatusKind =
  "owned" | "wishlist" | "pre_order" | "lent_out" | "borrowed" | "gifted_away" | "sold" | "lost";

export interface BookStatusResponse {
  id: string;
  user_id: string;
  book_id: string | null;
  release_id: string | null;
  status: BookStatusKind;
  acquired_at: string | null;
  notes: string | null;
  lent_to_user_id: string | null;
  lent_to_name: string | null;
  lent_at: string | null;
  returned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStatusPayload {
  book_id?: string | null;
  release_id?: string | null;
  status: BookStatusKind;
  notes?: string | null;
}

export interface UpdateStatusPayload {
  status?: BookStatusKind;
  notes?: string | null;
}

export interface LendStatusPayload {
  lent_to_user_id?: string | null;
  lent_to_name?: string | null;
}

export type StatusViewSort = "acquired_at" | "title";

export interface StatusViewParams {
  sort?: StatusViewSort;
  skip?: number;
  limit?: number;
}

// --- Share domain types ---

export interface ChatMessageResponse {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachment_book_id: string | null;
  attachment_collection_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface SharePayload {
  friend_id: string;
  message: string;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors (these are additive types only, nothing consumes them yet).

- [ ] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(collections): add collections/reviews/statuses/share domain types"
```

---

### Task 2: `lib/api/collections.ts`

**Files:**

- Create: `lib/api/collections.ts`
- Test: `lib/api/collections.test.ts`

**Interfaces:**

- Consumes: `apiClient` from `lib/api/client.ts`; types from Task 1 (`CollectionResponse`, `CollectionDetailResponse`, `CollectionItemResponse`, `CreateCollectionPayload`, `UpdateCollectionPayload`, `AddCollectionItemPayload`, `UpdateCollectionItemPayload`, `CollectionListParams`, `CollectionItemListParams`, `Page`).
- Produces: `listCollections(params)`, `getCollection(id, params)`, `createCollection(payload)`, `updateCollection(id, payload)`, `deleteCollection(id)`, `addCollectionItem(collectionId, payload)`, `updateCollectionItem(collectionId, itemId, payload)`, `removeCollectionItem(collectionId, itemId)`, `reorderCollectionItems(collectionId, itemIds)` — consumed by Task 5 hooks.

- [ ] **Step 1: Write the test file (fails first — module doesn't exist)**

```ts
// lib/api/collections.test.ts
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  addCollectionItem,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeCollectionItem,
  reorderCollectionItems,
  updateCollection,
  updateCollectionItem,
} from "./collections";

describe("collections api client", () => {
  it("lists collections", async () => {
    server.use(
      http.get("/api/collections", () =>
        HttpResponse.json({
          items: [{ id: "c1", name: "Favorites" }],
          total: 1,
          limit: 10,
          offset: 0,
        }),
      ),
    );
    const result = await listCollections();
    expect(result.items[0].name).toBe("Favorites");
  });

  it("gets a collection detail", async () => {
    server.use(
      http.get("/api/collections/:id", ({ params }) =>
        HttpResponse.json({
          id: params.id,
          name: "Favorites",
          items: { items: [], total: 0, limit: 10, offset: 0 },
        }),
      ),
    );
    const result = await getCollection("c1");
    expect(result.id).toBe("c1");
  });

  it("creates a collection", async () => {
    server.use(
      http.post("/api/collections", async ({ request }) => {
        const body = (await request.json()) as { name: string };
        return HttpResponse.json({ id: "c1", name: body.name }, { status: 201 });
      }),
    );
    const result = await createCollection({ name: "Favorites" });
    expect(result.id).toBe("c1");
  });

  it("updates a collection", async () => {
    server.use(
      http.patch("/api/collections/:id", () => HttpResponse.json({ id: "c1", name: "Updated" })),
    );
    const result = await updateCollection("c1", { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("deletes a collection", async () => {
    server.use(http.delete("/api/collections/:id", () => new HttpResponse(null, { status: 204 })));
    await expect(deleteCollection("c1")).resolves.toBeUndefined();
  });

  it("adds a collection item", async () => {
    server.use(
      http.post("/api/collections/:id/items", () =>
        HttpResponse.json({ id: "i1", collection_id: "c1", book_id: "b1" }, { status: 201 }),
      ),
    );
    const result = await addCollectionItem("c1", { book_id: "b1" });
    expect(result.id).toBe("i1");
  });

  it("updates a collection item", async () => {
    server.use(
      http.patch("/api/collections/:id/items/:itemId", () =>
        HttpResponse.json({ id: "i1", note: "great read" }),
      ),
    );
    const result = await updateCollectionItem("c1", "i1", { note: "great read" });
    expect(result.note).toBe("great read");
  });

  it("removes a collection item", async () => {
    server.use(
      http.delete(
        "/api/collections/:id/items/:itemId",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(removeCollectionItem("c1", "i1")).resolves.toBeUndefined();
  });

  it("reorders collection items", async () => {
    server.use(
      http.post("/api/collections/:id/reorder", () => new HttpResponse(null, { status: 204 })),
    );
    await expect(reorderCollectionItems("c1", ["i1", "i2"])).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test collections`
Expected: FAIL — `lib/api/collections.ts` not found.

- [ ] **Step 3: Implement the client**

```ts
// lib/api/collections.ts
import { apiClient } from "./client";
import type {
  AddCollectionItemPayload,
  CollectionDetailResponse,
  CollectionItemListParams,
  CollectionItemResponse,
  CollectionListParams,
  CollectionResponse,
  CreateCollectionPayload,
  Page,
  UpdateCollectionItemPayload,
  UpdateCollectionPayload,
} from "./types";

export async function listCollections(
  params: CollectionListParams = {},
): Promise<Page<CollectionResponse>> {
  const { data } = await apiClient.get("/collections", { params });
  return data;
}

export async function getCollection(
  collectionId: string,
  params: CollectionItemListParams = {},
): Promise<CollectionDetailResponse> {
  const { data } = await apiClient.get(`/collections/${collectionId}`, { params });
  return data;
}

export async function createCollection(
  payload: CreateCollectionPayload,
): Promise<CollectionResponse> {
  const { data } = await apiClient.post("/collections", payload);
  return data;
}

export async function updateCollection(
  collectionId: string,
  payload: UpdateCollectionPayload,
): Promise<CollectionResponse> {
  const { data } = await apiClient.patch(`/collections/${collectionId}`, payload);
  return data;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  await apiClient.delete(`/collections/${collectionId}`);
}

export async function addCollectionItem(
  collectionId: string,
  payload: AddCollectionItemPayload,
): Promise<CollectionItemResponse> {
  const { data } = await apiClient.post(`/collections/${collectionId}/items`, payload);
  return data;
}

export async function updateCollectionItem(
  collectionId: string,
  itemId: string,
  payload: UpdateCollectionItemPayload,
): Promise<CollectionItemResponse> {
  const { data } = await apiClient.patch(`/collections/${collectionId}/items/${itemId}`, payload);
  return data;
}

export async function removeCollectionItem(collectionId: string, itemId: string): Promise<void> {
  await apiClient.delete(`/collections/${collectionId}/items/${itemId}`);
}

export async function reorderCollectionItems(
  collectionId: string,
  itemIds: string[],
): Promise<void> {
  await apiClient.post(`/collections/${collectionId}/reorder`, { item_ids: itemIds });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test collections`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/api/collections.ts lib/api/collections.test.ts
git commit -m "feat(collections): add collections API client"
```

---

### Task 3: `lib/api/reviews.ts` + extend `lib/api/books.ts` with release reviews

**Files:**

- Create: `lib/api/reviews.ts`
- Test: `lib/api/reviews.test.ts`
- Create: `lib/api/releases.ts` addition — check if `lib/api/releases.ts` already exists first (it does, from Block 2); modify it to add `getReleaseReviews`.
- Test: modify `lib/api/releases.test.ts` if it exists, else create `lib/api/releases.test.ts`.

**Interfaces:**

- Consumes: `apiClient`; types from Task 1 (`CreateReviewPayload`, `UpdateReviewPayload`); `ReviewResponse`, `ReviewSort`, `Page` from Block 2's `lib/api/types.ts`.
- Produces: `createReview(payload)`, `getReview(id)`, `updateReview(id, payload)`, `deleteReview(id)`, `getReleaseReviews(releaseId, params)` — consumed by Task 5 hooks.

- [ ] **Step 1: Read the existing `lib/api/releases.ts` to see its current shape before editing**

Run: `cat lib/api/releases.ts`

- [ ] **Step 2: Write the reviews test file**

```ts
// lib/api/reviews.test.ts
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { createReview, deleteReview, getReview, updateReview } from "./reviews";

describe("reviews api client", () => {
  it("creates a review", async () => {
    server.use(
      http.post("/api/reviews", async ({ request }) => {
        const body = (await request.json()) as { book_id: string };
        return HttpResponse.json({ id: "r1", book_id: body.book_id, rating: 5 }, { status: 201 });
      }),
    );
    const result = await createReview({ book_id: "b1", rating: 5 });
    expect(result.id).toBe("r1");
  });

  it("gets a review", async () => {
    server.use(http.get("/api/reviews/:id", ({ params }) => HttpResponse.json({ id: params.id })));
    const result = await getReview("r1");
    expect(result.id).toBe("r1");
  });

  it("updates a review", async () => {
    server.use(http.patch("/api/reviews/:id", () => HttpResponse.json({ id: "r1", rating: 4 })));
    const result = await updateReview("r1", { rating: 4 });
    expect(result.rating).toBe(4);
  });

  it("deletes a review", async () => {
    server.use(http.delete("/api/reviews/:id", () => new HttpResponse(null, { status: 204 })));
    await expect(deleteReview("r1")).resolves.toBeUndefined();
  });

  it("surfaces the exactly-one-of validation error", async () => {
    server.use(
      http.post("/api/reviews", () =>
        HttpResponse.json(
          {
            detail: [
              {
                type: "value_error",
                loc: ["body"],
                msg: "Value error, exactly one of book_id or release_id is required",
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    await expect(createReview({})).rejects.toMatchObject({
      response: { status: 422 },
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test reviews`
Expected: FAIL — `lib/api/reviews.ts` not found.

- [ ] **Step 4: Implement `lib/api/reviews.ts`**

```ts
// lib/api/reviews.ts
import { apiClient } from "./client";
import type { CreateReviewPayload, ReviewResponse, UpdateReviewPayload } from "./types";

export async function createReview(payload: CreateReviewPayload): Promise<ReviewResponse> {
  const { data } = await apiClient.post("/reviews", payload);
  return data;
}

export async function getReview(reviewId: string): Promise<ReviewResponse> {
  const { data } = await apiClient.get(`/reviews/${reviewId}`);
  return data;
}

export async function updateReview(
  reviewId: string,
  payload: UpdateReviewPayload,
): Promise<ReviewResponse> {
  const { data } = await apiClient.patch(`/reviews/${reviewId}`, payload);
  return data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${reviewId}`);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test reviews`
Expected: PASS (5 tests)

- [ ] **Step 6: Add `getReleaseReviews` to `lib/api/releases.ts`**

Append this function to the existing file (match the existing import style already in that file for `Page`/`ReviewResponse`/`ReviewSort` from `./types`):

```ts
export async function getReleaseReviews(
  releaseId: string,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
): Promise<Page<ReviewResponse>> {
  const { data } = await apiClient.get(`/releases/${releaseId}/reviews`, { params });
  return data;
}
```

- [ ] **Step 7: Add a test for it to `lib/api/releases.test.ts`** (append to existing file, or create if it doesn't exist, following the existing file's test style)

```ts
describe("getReleaseReviews", () => {
  it("fetches reviews for a release", async () => {
    server.use(
      http.get("/api/releases/:id/reviews", () =>
        HttpResponse.json({ items: [{ id: "r1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const result = await getReleaseReviews("rel1");
    expect(result.items[0].id).toBe("r1");
  });
});
```

- [ ] **Step 8: Run full test suite for both files**

Run: `pnpm test reviews releases`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add lib/api/reviews.ts lib/api/reviews.test.ts lib/api/releases.ts lib/api/releases.test.ts
git commit -m "feat(reviews): add reviews API client and release-reviews endpoint"
```

---

### Task 4: `lib/api/statuses.ts`

**Files:**

- Create: `lib/api/statuses.ts`
- Test: `lib/api/statuses.test.ts`

**Interfaces:**

- Consumes: `apiClient`; types from Task 1 (`BookStatusResponse`, `BookStatusKind`, `CreateStatusPayload`, `UpdateStatusPayload`, `LendStatusPayload`, `StatusViewParams`, `Page`).
- Produces: `listStatuses(status?)`, `createStatus(payload)`, `updateStatus(id, payload)`, `deleteStatus(id)`, `lendStatus(id, payload)`, `returnStatus(id)`, `getLibrary(params)`, `getWishlist(params)`, `getLentOut(params)`, `getBorrowed(params)` — consumed by Task 5 hooks.

- [ ] **Step 1: Write the test file**

```ts
// lib/api/statuses.test.ts
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  createStatus,
  deleteStatus,
  getBorrowed,
  getLentOut,
  getLibrary,
  getWishlist,
  lendStatus,
  listStatuses,
  returnStatus,
  updateStatus,
} from "./statuses";

describe("statuses api client", () => {
  it("lists statuses as a plain array (not paginated)", async () => {
    server.use(
      http.get("/api/me/statuses", () => HttpResponse.json([{ id: "s1", status: "owned" }])),
    );
    const result = await listStatuses();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe("s1");
  });

  it("filters listStatuses by status query param", async () => {
    server.use(
      http.get("/api/me/statuses", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("status")).toBe("wishlist");
        return HttpResponse.json([]);
      }),
    );
    await listStatuses("wishlist");
  });

  it("creates a status", async () => {
    server.use(
      http.post("/api/me/statuses", () =>
        HttpResponse.json({ id: "s1", status: "owned" }, { status: 201 }),
      ),
    );
    const result = await createStatus({ book_id: "b1", status: "owned" });
    expect(result.id).toBe("s1");
  });

  it("updates a status", async () => {
    server.use(
      http.patch("/api/me/statuses/:id", () => HttpResponse.json({ id: "s1", status: "wishlist" })),
    );
    const result = await updateStatus("s1", { status: "wishlist" });
    expect(result.status).toBe("wishlist");
  });

  it("deletes a status", async () => {
    server.use(http.delete("/api/me/statuses/:id", () => new HttpResponse(null, { status: 204 })));
    await expect(deleteStatus("s1")).resolves.toBeUndefined();
  });

  it("lends a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/lend", () =>
        HttpResponse.json({ id: "s1", status: "lent_out", lent_to_name: "Alex" }),
      ),
    );
    const result = await lendStatus("s1", { lent_to_name: "Alex" });
    expect(result.lent_to_name).toBe("Alex");
  });

  it("returns a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/return", () =>
        HttpResponse.json({ id: "s1", status: "owned", returned_at: "2026-07-21T00:00:00Z" }),
      ),
    );
    const result = await returnStatus("s1");
    expect(result.returned_at).not.toBeNull();
  });

  it("fetches library, wishlist, lent-out, borrowed as paginated views", async () => {
    server.use(
      http.get("/api/me/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
      http.get("/api/me/wishlist", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
      http.get("/api/me/lent-out", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
      http.get("/api/me/borrowed", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
    );
    await expect(getLibrary()).resolves.toMatchObject({ items: [] });
    await expect(getWishlist()).resolves.toMatchObject({ items: [] });
    await expect(getLentOut()).resolves.toMatchObject({ items: [] });
    await expect(getBorrowed()).resolves.toMatchObject({ items: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test statuses`
Expected: FAIL — `lib/api/statuses.ts` not found.

- [ ] **Step 3: Implement the client**

```ts
// lib/api/statuses.ts
import { apiClient } from "./client";
import type {
  BookStatusKind,
  BookStatusResponse,
  CreateStatusPayload,
  LendStatusPayload,
  Page,
  StatusViewParams,
  UpdateStatusPayload,
} from "./types";

export async function listStatuses(status?: BookStatusKind): Promise<BookStatusResponse[]> {
  const { data } = await apiClient.get("/me/statuses", { params: status ? { status } : {} });
  return data;
}

export async function createStatus(payload: CreateStatusPayload): Promise<BookStatusResponse> {
  const { data } = await apiClient.post("/me/statuses", payload);
  return data;
}

export async function updateStatus(
  statusId: string,
  payload: UpdateStatusPayload,
): Promise<BookStatusResponse> {
  const { data } = await apiClient.patch(`/me/statuses/${statusId}`, payload);
  return data;
}

export async function deleteStatus(statusId: string): Promise<void> {
  await apiClient.delete(`/me/statuses/${statusId}`);
}

export async function lendStatus(
  statusId: string,
  payload: LendStatusPayload,
): Promise<BookStatusResponse> {
  const { data } = await apiClient.post(`/me/statuses/${statusId}/lend`, payload);
  return data;
}

export async function returnStatus(statusId: string): Promise<BookStatusResponse> {
  const { data } = await apiClient.post(`/me/statuses/${statusId}/return`, {});
  return data;
}

async function getStatusView(
  view: "library" | "wishlist" | "lent-out" | "borrowed",
  params: StatusViewParams = {},
): Promise<Page<BookStatusResponse>> {
  const { data } = await apiClient.get(`/me/${view}`, { params });
  return data;
}

export const getLibrary = (params: StatusViewParams = {}) => getStatusView("library", params);
export const getWishlist = (params: StatusViewParams = {}) => getStatusView("wishlist", params);
export const getLentOut = (params: StatusViewParams = {}) => getStatusView("lent-out", params);
export const getBorrowed = (params: StatusViewParams = {}) => getStatusView("borrowed", params);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test statuses`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/api/statuses.ts lib/api/statuses.test.ts
git commit -m "feat(statuses): add statuses API client with library/wishlist/lent-out/borrowed views"
```

---

### Task 5: `lib/api/share.ts` and `lib/api/friends-content.ts`

**Files:**

- Create: `lib/api/share.ts`
- Test: `lib/api/share.test.ts`
- Create: `lib/api/friends-content.ts`
- Test: `lib/api/friends-content.test.ts`

**Interfaces:**

- Consumes: `apiClient`; types from Task 1 (`ChatMessageResponse`, `SharePayload`); `CollectionResponse`, `BookStatusResponse`, `Page` from `lib/api/types.ts`.
- Produces: `shareBook(bookId, payload)`, `shareCollection(collectionId, payload)`, `getFriendCollections(userId, params)`, `getFriendLibrary(userId, params)` — consumed by Task 5 (hooks task, same number reused below is a typo-guard: this is Task 5 of Phase 1, hooks are Task 6).

- [ ] **Step 1: Write `lib/api/share.test.ts`**

```ts
// lib/api/share.test.ts
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { shareBook, shareCollection } from "./share";

describe("share api client", () => {
  it("shares a book", async () => {
    server.use(
      http.post("/api/share/book/:id", () =>
        HttpResponse.json({ id: "m1", thread_id: "t1", attachment_book_id: "b1" }),
      ),
    );
    const result = await shareBook("b1", { friend_id: "f1", message: "check this out" });
    expect(result.attachment_book_id).toBe("b1");
  });

  it("shares a collection", async () => {
    server.use(
      http.post("/api/share/collection/:id", () =>
        HttpResponse.json({ id: "m1", thread_id: "t1", attachment_collection_id: "c1" }),
      ),
    );
    const result = await shareCollection("c1", { friend_id: "f1", message: "check this out" });
    expect(result.attachment_collection_id).toBe("c1");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test lib/api/share.test.ts`
Expected: FAIL — `lib/api/share.ts` not found.

- [ ] **Step 3: Implement `lib/api/share.ts`**

```ts
// lib/api/share.ts
import { apiClient } from "./client";
import type { ChatMessageResponse, SharePayload } from "./types";

export async function shareBook(
  bookId: string,
  payload: SharePayload,
): Promise<ChatMessageResponse> {
  const { data } = await apiClient.post(`/share/book/${bookId}`, payload);
  return data;
}

export async function shareCollection(
  collectionId: string,
  payload: SharePayload,
): Promise<ChatMessageResponse> {
  const { data } = await apiClient.post(`/share/collection/${collectionId}`, payload);
  return data;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test lib/api/share.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write `lib/api/friends-content.test.ts`**

```ts
// lib/api/friends-content.test.ts
import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { getFriendCollections, getFriendLibrary } from "./friends-content";

describe("friends-content api client", () => {
  it("fetches a friend's public collections", async () => {
    server.use(
      http.get("/api/friends/:userId/collections", () =>
        HttpResponse.json({ items: [{ id: "c1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const result = await getFriendCollections("u1");
    expect(result.items[0].id).toBe("c1");
  });

  it("fetches a friend's library", async () => {
    server.use(
      http.get("/api/friends/:userId/library", () =>
        HttpResponse.json({ items: [{ id: "s1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const result = await getFriendLibrary("u1");
    expect(result.items[0].id).toBe("s1");
  });

  it("surfaces a 403 for a non-friend or private collection", async () => {
    server.use(
      http.get("/api/friends/:userId/collections", () =>
        HttpResponse.json({ detail: "Not friends" }, { status: 403 }),
      ),
    );
    await expect(getFriendCollections("stranger")).rejects.toMatchObject({
      response: { status: 403 },
    });
  });
});
```

- [ ] **Step 6: Run test, verify fail**

Run: `pnpm test friends-content`
Expected: FAIL — `lib/api/friends-content.ts` not found.

- [ ] **Step 7: Implement `lib/api/friends-content.ts`**

```ts
// lib/api/friends-content.ts
import { apiClient } from "./client";
import type { BookStatusResponse, CollectionResponse, Page } from "./types";

interface FriendContentParams {
  skip?: number;
  limit?: number;
}

export async function getFriendCollections(
  userId: string,
  params: FriendContentParams = {},
): Promise<Page<CollectionResponse>> {
  const { data } = await apiClient.get(`/friends/${userId}/collections`, { params });
  return data;
}

export async function getFriendLibrary(
  userId: string,
  params: FriendContentParams = {},
): Promise<Page<BookStatusResponse>> {
  const { data } = await apiClient.get(`/friends/${userId}/library`, { params });
  return data;
}
```

- [ ] **Step 8: Run test, verify pass**

Run: `pnpm test friends-content`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add lib/api/share.ts lib/api/share.test.ts lib/api/friends-content.ts lib/api/friends-content.test.ts
git commit -m "feat(share): add share and friend-content API clients"
```

---

## Phase 2 — TanStack Query Hooks

### Task 6: `hooks/useCollections.ts`

**Files:**

- Create: `hooks/useCollections.ts`
- Test: `hooks/useCollections.test.tsx`

**Interfaces:**

- Consumes: all functions from `lib/api/collections.ts` (Task 2); types from `lib/api/types.ts`.
- Produces: `useCollections(params?)`, `useCollection(id, params?)`, `useCreateCollection()`, `useUpdateCollection()`, `useDeleteCollection()`, `useAddCollectionItem(collectionId)`, `useUpdateCollectionItem(collectionId)`, `useRemoveCollectionItem(collectionId)`, `useReorderCollectionItems(collectionId)` — consumed by Phase 3 components/pages.

- [ ] **Step 1: Write the hook test file**

```tsx
// hooks/useCollections.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  useCollection,
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useReorderCollectionItems,
} from "./useCollections";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useCollections", () => {
  it("fetches a page of collections", async () => {
    server.use(
      http.get("/api/collections", () =>
        HttpResponse.json({
          items: [{ id: "c1", name: "Favorites" }],
          total: 1,
          limit: 10,
          offset: 0,
        }),
      ),
    );
    const { result } = renderHook(() => useCollections(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].name).toBe("Favorites");
  });
});

describe("useCollection", () => {
  it("does not fetch when id is undefined", () => {
    const { result } = renderHook(() => useCollection(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("surfaces a 404", async () => {
    server.use(
      http.get("/api/collections/:id", () =>
        HttpResponse.json({ detail: "Not found" }, { status: 404 }),
      ),
    );
    const { result } = renderHook(() => useCollection("missing"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCollection", () => {
  it("creates a collection and invalidates the list", async () => {
    server.use(
      http.post("/api/collections", () =>
        HttpResponse.json({ id: "c1", name: "New" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useCreateCollection(), { wrapper });
    result.current.mutate({ name: "New" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteCollection", () => {
  it("deletes a collection", async () => {
    server.use(http.delete("/api/collections/:id", () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useDeleteCollection(), { wrapper });
    result.current.mutate("c1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReorderCollectionItems", () => {
  it("reorders items for a given collection", async () => {
    server.use(
      http.post("/api/collections/:id/reorder", () => new HttpResponse(null, { status: 204 })),
    );
    const { result } = renderHook(() => useReorderCollectionItems("c1"), { wrapper });
    result.current.mutate(["i1", "i2"]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test useCollections`
Expected: FAIL — `hooks/useCollections.ts` not found.

- [ ] **Step 3: Implement the hooks**

```ts
// hooks/useCollections.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCollectionItem,
  createCollection,
  deleteCollection,
  getCollection,
  listCollections,
  removeCollectionItem,
  reorderCollectionItems,
  updateCollection,
  updateCollectionItem,
} from "@/lib/api/collections";
import type {
  AddCollectionItemPayload,
  CollectionItemListParams,
  CollectionListParams,
  CreateCollectionPayload,
  UpdateCollectionItemPayload,
  UpdateCollectionPayload,
} from "@/lib/api/types";

export function useCollections(params: CollectionListParams = {}) {
  return useQuery({
    queryKey: ["collections", params],
    queryFn: () => listCollections(params),
  });
}

export function useCollection(
  collectionId: string | undefined,
  params: CollectionItemListParams = {},
) {
  return useQuery({
    queryKey: ["collections", collectionId, params],
    queryFn: () => getCollection(collectionId as string, params),
    enabled: Boolean(collectionId),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCollectionPayload) => createCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useUpdateCollection(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCollectionPayload) => updateCollection(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) => deleteCollection(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useAddCollectionItem(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddCollectionItemPayload) => addCollectionItem(collectionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useUpdateCollectionItem(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: UpdateCollectionItemPayload }) =>
      updateCollectionItem(collectionId, itemId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useRemoveCollectionItem(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => removeCollectionItem(collectionId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}

export function useReorderCollectionItems(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: string[]) => reorderCollectionItems(collectionId, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
    },
  });
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test useCollections`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useCollections.ts hooks/useCollections.test.tsx
git commit -m "feat(collections): add useCollections query/mutation hooks"
```

---

### Task 7: `hooks/useReviews.ts`

**Files:**

- Create: `hooks/useReviews.ts`
- Test: `hooks/useReviews.test.tsx`
- Modify: `hooks/useBooks.ts` — no change needed (already has `useBookReviews`); confirm import compatibility only.
- Create (if not present) a `useReleaseReviews` hook: check whether `hooks/useReleases.ts` exists (it does, per Block 2) and add it there instead of a new file.

**Interfaces:**

- Consumes: `createReview`, `getReview`, `updateReview`, `deleteReview` from `lib/api/reviews.ts` (Task 3); `getReleaseReviews` from `lib/api/releases.ts` (Task 3).
- Produces: `useReview(id)`, `useCreateReview()`, `useUpdateReview(id)`, `useDeleteReview()`, and (added to `hooks/useReleases.ts`) `useReleaseReviews(releaseId, params?)` — consumed by Phase 3 review components.

- [ ] **Step 1: Write the hook test file**

```tsx
// hooks/useReviews.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useCreateReview, useDeleteReview, useReview, useUpdateReview } from "./useReviews";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useReview", () => {
  it("fetches a review by id", async () => {
    server.use(http.get("/api/reviews/:id", ({ params }) => HttpResponse.json({ id: params.id })));
    const { result } = renderHook(() => useReview("r1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("r1");
  });

  it("does not fetch when id is undefined", () => {
    const { result } = renderHook(() => useReview(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCreateReview", () => {
  it("creates a review", async () => {
    server.use(
      http.post("/api/reviews", () => HttpResponse.json({ id: "r1", rating: 5 }, { status: 201 })),
    );
    const { result } = renderHook(() => useCreateReview(), { wrapper });
    result.current.mutate({ book_id: "b1", rating: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("surfaces the 422 exactly-one-of error", async () => {
    server.use(
      http.post("/api/reviews", () =>
        HttpResponse.json(
          {
            detail: [
              {
                msg: "Value error, exactly one of book_id or release_id is required",
                loc: ["body"],
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const { result } = renderHook(() => useCreateReview(), { wrapper });
    result.current.mutate({});
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateReview", () => {
  it("updates a review", async () => {
    server.use(http.patch("/api/reviews/:id", () => HttpResponse.json({ id: "r1", rating: 3 })));
    const { result } = renderHook(() => useUpdateReview("r1"), { wrapper });
    result.current.mutate({ rating: 3 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteReview", () => {
  it("deletes a review", async () => {
    server.use(http.delete("/api/reviews/:id", () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useDeleteReview(), { wrapper });
    result.current.mutate("r1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test useReviews`
Expected: FAIL — `hooks/useReviews.ts` not found.

- [ ] **Step 3: Implement `hooks/useReviews.ts`**

Note: mutations invalidate both the specific review detail key AND the Block 2 book/release review-list keys (`["books", bookId, "reviews"]` / `["releases", releaseId, "reviews"]`) — since the review payload doesn't reliably carry `book_id`/`release_id` back out in every response context, invalidate broadly with a predicate instead of trying to reconstruct the exact key.

```ts
// hooks/useReviews.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReview, deleteReview, getReview, updateReview } from "@/lib/api/reviews";
import type { CreateReviewPayload, UpdateReviewPayload } from "@/lib/api/types";

function invalidateReviewLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (query) =>
      (query.queryKey[0] === "books" || query.queryKey[0] === "releases") &&
      query.queryKey.includes("reviews"),
  });
}

export function useReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", reviewId],
    queryFn: () => getReview(reviewId as string),
    enabled: Boolean(reviewId),
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReviewPayload) => createReview(payload),
    onSuccess: () => invalidateReviewLists(queryClient),
  });
}

export function useUpdateReview(reviewId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateReviewPayload) => updateReview(reviewId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", reviewId] });
      invalidateReviewLists(queryClient);
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => invalidateReviewLists(queryClient),
  });
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test useReviews`
Expected: PASS (6 tests)

- [ ] **Step 5: Read `hooks/useReleases.ts` and add `useReleaseReviews`**

Run: `cat hooks/useReleases.ts` first to match its existing import/query-key style, then append:

```ts
export function useReleaseReviews(
  releaseId: string | undefined,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["releases", releaseId, "reviews", params],
    queryFn: () => getReleaseReviews(releaseId as string, params),
    enabled: Boolean(releaseId),
  });
}
```

(Add `getReleaseReviews` to the existing import from `@/lib/api/releases`, and `ReviewSort` to the existing import from `@/lib/api/types` if not already imported.)

- [ ] **Step 6: Add a test for `useReleaseReviews` to `hooks/useReleases.test.tsx`** (append, following existing file's pattern)

```tsx
describe("useReleaseReviews", () => {
  it("fetches reviews for a release", async () => {
    server.use(
      http.get("/api/releases/:id/reviews", () =>
        HttpResponse.json({ items: [{ id: "r1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useReleaseReviews("rel1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].id).toBe("r1");
  });
});
```

- [ ] **Step 7: Run both test files, verify pass**

Run: `pnpm test useReviews useReleases`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add hooks/useReviews.ts hooks/useReviews.test.tsx hooks/useReleases.ts hooks/useReleases.test.tsx
git commit -m "feat(reviews): add useReviews hooks and useReleaseReviews"
```

---

### Task 8: `hooks/useStatuses.ts`

**Files:**

- Create: `hooks/useStatuses.ts`
- Test: `hooks/useStatuses.test.tsx`

**Interfaces:**

- Consumes: all functions from `lib/api/statuses.ts` (Task 4).
- Produces: `useStatuses(status?)`, `useLibrary(params?)`, `useWishlist(params?)`, `useLentOut(params?)`, `useBorrowed(params?)`, `useCreateStatus()`, `useUpdateStatus(id)`, `useDeleteStatus()`, `useLendStatus(id)`, `useReturnStatus(id)` — consumed by Phase 3 status components/pages.

- [ ] **Step 1: Write the hook test file**

```tsx
// hooks/useStatuses.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  useCreateStatus,
  useLendStatus,
  useLibrary,
  useReturnStatus,
  useStatuses,
} from "./useStatuses";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useStatuses", () => {
  it("fetches all statuses", async () => {
    server.use(
      http.get("/api/me/statuses", () => HttpResponse.json([{ id: "s1", status: "owned" }])),
    );
    const { result } = renderHook(() => useStatuses(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("s1");
  });
});

describe("useLibrary", () => {
  it("fetches the paginated library view", async () => {
    server.use(
      http.get("/api/me/library", () =>
        HttpResponse.json({ items: [{ id: "s1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useLibrary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].id).toBe("s1");
  });
});

describe("useCreateStatus", () => {
  it("creates a status and invalidates statuses broadly", async () => {
    server.use(
      http.post("/api/me/statuses", () =>
        HttpResponse.json({ id: "s1", status: "wishlist" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useCreateStatus(), { wrapper });
    result.current.mutate({ book_id: "b1", status: "wishlist" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLendStatus", () => {
  it("lends a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/lend", () =>
        HttpResponse.json({ id: "s1", status: "lent_out" }),
      ),
    );
    const { result } = renderHook(() => useLendStatus("s1"), { wrapper });
    result.current.mutate({ lent_to_name: "Alex" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReturnStatus", () => {
  it("returns a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/return", () =>
        HttpResponse.json({ id: "s1", status: "owned" }),
      ),
    );
    const { result } = renderHook(() => useReturnStatus("s1"), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test useStatuses`
Expected: FAIL — `hooks/useStatuses.ts` not found.

- [ ] **Step 3: Implement the hooks**

Note: per the spec, all status mutations invalidate `["statuses"]` broadly (a single lend/return affects multiple views at once — fine-grained invalidation isn't worth the complexity at expected per-user data volume).

```ts
// hooks/useStatuses.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStatus,
  deleteStatus,
  getBorrowed,
  getLentOut,
  getLibrary,
  getWishlist,
  lendStatus,
  listStatuses,
  returnStatus,
  updateStatus,
} from "@/lib/api/statuses";
import type {
  BookStatusKind,
  CreateStatusPayload,
  LendStatusPayload,
  StatusViewParams,
  UpdateStatusPayload,
} from "@/lib/api/types";

function invalidateStatuses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["statuses"] });
}

export function useStatuses(status?: BookStatusKind) {
  return useQuery({
    queryKey: ["statuses", status],
    queryFn: () => listStatuses(status),
  });
}

export function useLibrary(params: StatusViewParams = {}) {
  return useQuery({ queryKey: ["statuses", "library", params], queryFn: () => getLibrary(params) });
}

export function useWishlist(params: StatusViewParams = {}) {
  return useQuery({
    queryKey: ["statuses", "wishlist", params],
    queryFn: () => getWishlist(params),
  });
}

export function useLentOut(params: StatusViewParams = {}) {
  return useQuery({
    queryKey: ["statuses", "lent-out", params],
    queryFn: () => getLentOut(params),
  });
}

export function useBorrowed(params: StatusViewParams = {}) {
  return useQuery({
    queryKey: ["statuses", "borrowed", params],
    queryFn: () => getBorrowed(params),
  });
}

export function useCreateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStatusPayload) => createStatus(payload),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useUpdateStatus(statusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateStatusPayload) => updateStatus(statusId, payload),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useDeleteStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusId: string) => deleteStatus(statusId),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useLendStatus(statusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LendStatusPayload) => lendStatus(statusId, payload),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}

export function useReturnStatus(statusId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => returnStatus(statusId),
    onSuccess: () => invalidateStatuses(queryClient),
  });
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test useStatuses`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useStatuses.ts hooks/useStatuses.test.tsx
git commit -m "feat(statuses): add useStatuses hooks with library/wishlist/lent-out/borrowed views"
```

---

### Task 9: `hooks/useShare.ts` and `hooks/useFriendContent.ts`

**Files:**

- Create: `hooks/useShare.ts`
- Test: `hooks/useShare.test.tsx`
- Create: `hooks/useFriendContent.ts`
- Test: `hooks/useFriendContent.test.tsx`

**Interfaces:**

- Consumes: `shareBook`, `shareCollection` from `lib/api/share.ts`; `getFriendCollections`, `getFriendLibrary` from `lib/api/friends-content.ts` (both Task 5).
- Produces: `useShareBook()`, `useShareCollection()`, `useFriendCollections(userId, params?)`, `useFriendLibrary(userId, params?)` — consumed by Phase 3 share/friend-shelf components.

- [ ] **Step 1: Write `hooks/useShare.test.tsx`**

```tsx
// hooks/useShare.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useShareBook, useShareCollection } from "./useShare";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useShareBook", () => {
  it("shares a book", async () => {
    server.use(
      http.post("/api/share/book/:id", () => HttpResponse.json({ id: "m1", thread_id: "t1" })),
    );
    const { result } = renderHook(() => useShareBook(), { wrapper });
    result.current.mutate({ bookId: "b1", payload: { friend_id: "f1", message: "hi" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useShareCollection", () => {
  it("shares a collection", async () => {
    server.use(
      http.post("/api/share/collection/:id", () =>
        HttpResponse.json({ id: "m1", thread_id: "t1" }),
      ),
    );
    const { result } = renderHook(() => useShareCollection(), { wrapper });
    result.current.mutate({ collectionId: "c1", payload: { friend_id: "f1", message: "hi" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test useShare`
Expected: FAIL — `hooks/useShare.ts` not found.

- [ ] **Step 3: Implement `hooks/useShare.ts`**

```ts
// hooks/useShare.ts
import { useMutation } from "@tanstack/react-query";
import { shareBook, shareCollection } from "@/lib/api/share";
import type { SharePayload } from "@/lib/api/types";

export function useShareBook() {
  return useMutation({
    mutationFn: ({ bookId, payload }: { bookId: string; payload: SharePayload }) =>
      shareBook(bookId, payload),
  });
}

export function useShareCollection() {
  return useMutation({
    mutationFn: ({ collectionId, payload }: { collectionId: string; payload: SharePayload }) =>
      shareCollection(collectionId, payload),
  });
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test useShare`
Expected: PASS (2 tests)

- [ ] **Step 5: Write `hooks/useFriendContent.test.tsx`**

```tsx
// hooks/useFriendContent.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useFriendCollections, useFriendLibrary } from "./useFriendContent";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useFriendCollections", () => {
  it("fetches a friend's public collections", async () => {
    server.use(
      http.get("/api/friends/:userId/collections", () =>
        HttpResponse.json({ items: [{ id: "c1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useFriendCollections("u1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("surfaces a 403", async () => {
    server.use(
      http.get("/api/friends/:userId/collections", () =>
        HttpResponse.json({ detail: "Not friends" }, { status: 403 }),
      ),
    );
    const { result } = renderHook(() => useFriendCollections("stranger"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useFriendLibrary", () => {
  it("fetches a friend's library", async () => {
    server.use(
      http.get("/api/friends/:userId/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useFriendLibrary("u1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

- [ ] **Step 6: Run test, verify fail**

Run: `pnpm test useFriendContent`
Expected: FAIL — `hooks/useFriendContent.ts` not found.

- [ ] **Step 7: Implement `hooks/useFriendContent.ts`**

```ts
// hooks/useFriendContent.ts
import { useQuery } from "@tanstack/react-query";
import { getFriendCollections, getFriendLibrary } from "@/lib/api/friends-content";

interface FriendContentParams {
  skip?: number;
  limit?: number;
}

export function useFriendCollections(userId: string | undefined, params: FriendContentParams = {}) {
  return useQuery({
    queryKey: ["friends", userId, "collections", params],
    queryFn: () => getFriendCollections(userId as string, params),
    enabled: Boolean(userId),
  });
}

export function useFriendLibrary(userId: string | undefined, params: FriendContentParams = {}) {
  return useQuery({
    queryKey: ["friends", userId, "library", params],
    queryFn: () => getFriendLibrary(userId as string, params),
    enabled: Boolean(userId),
  });
}
```

- [ ] **Step 8: Run test, verify pass**

Run: `pnpm test useFriendContent`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add hooks/useShare.ts hooks/useShare.test.tsx hooks/useFriendContent.ts hooks/useFriendContent.test.tsx
git commit -m "feat(share): add useShare and useFriendContent hooks"
```

---

## Phase 3 — Components

Every component below follows the `.tsx` + `.stories.tsx` + `.test.tsx` trio and the
`"use client"` / `useTranslations(<namespace>)` / shadcn `render` prop conventions
established in Block 2 (see `components/catalog/book-card.tsx`,
`components/catalog/suggest-edit-dialog.tsx` for the reference patterns — form
dialogs mirror `suggest-edit-dialog.tsx`'s controlled-input + `extractErrorMessage`

- `DialogFooter` structure).

### Task 10: Add message namespaces for collections/reviews/statuses/share

**Files:**

- Modify: `messages/en.json`, `messages/uk.json`

**Interfaces:**

- Produces: top-level namespaces `collections`, `reviews`, `statuses`, `share` — consumed by every component task below via `useTranslations("<namespace>...")`.

- [ ] **Step 1: Add the `collections` namespace to both files**

`messages/en.json` (add as a new top-level key, alongside existing `catalog`/`contributions` etc.):

```json
"collections": {
  "pageTitle": "My collections",
  "newCollection": "New collection",
  "empty": "You haven't created any collections yet.",
  "loading": "Loading collections...",
  "form": {
    "nameLabel": "Name",
    "descriptionLabel": "Description",
    "isPublicLabel": "Make this collection public",
    "coverImageLabel": "Cover image URL",
    "createTitle": "New collection",
    "editTitle": "Edit collection",
    "submitCreate": "Create collection",
    "submitEdit": "Save changes",
    "submitting": "Saving..."
  },
  "detail": {
    "itemsTitle": "Items",
    "emptyItems": "No items in this collection yet.",
    "editButton": "Edit",
    "deleteButton": "Delete",
    "deleteConfirmTitle": "Delete this collection?",
    "deleteConfirmDescription": "This removes the collection and all its items. This cannot be undone.",
    "removeItem": "Remove",
    "moveUp": "Move up",
    "moveDown": "Move down",
    "noteLabel": "Note",
    "shareButton": "Share"
  },
  "addToCollection": {
    "trigger": "Add to collection",
    "title": "Add to a collection",
    "noCollections": "You don't have any collections yet.",
    "createNew": "Create a new collection",
    "added": "Added to {name}."
  }
},
"reviews": {
  "sectionTitle": "Reviews",
  "empty": "No reviews yet.",
  "loading": "Loading reviews...",
  "spoilerWarning": "Contains spoilers",
  "writeReview": "Write a review",
  "editReview": "Edit review",
  "deleteReview": "Delete review",
  "deleteConfirmTitle": "Delete this review?",
  "deleteConfirmDescription": "This cannot be undone.",
  "form": {
    "ratingLabel": "Rating",
    "titleLabel": "Title",
    "bodyLabel": "Review",
    "isPublicLabel": "Make this review public",
    "containsSpoilersLabel": "Contains spoilers",
    "submitCreate": "Post review",
    "submitEdit": "Save changes",
    "submitting": "Saving...",
    "exactlyOneRequired": "Pick a book or a specific edition, not both."
  },
  "myReviewsTitle": "My reviews"
},
"statuses": {
  "pageTitle": "My books",
  "tabs": {
    "library": "Library",
    "wishlist": "Wishlist",
    "lentOut": "Lent out",
    "borrowed": "Borrowed"
  },
  "empty": "Nothing here yet.",
  "loading": "Loading...",
  "changeStatus": "Change status",
  "lendAction": "Lend to...",
  "returnAction": "Mark returned",
  "kind": {
    "owned": "Owned",
    "wishlist": "Wishlist",
    "pre_order": "Pre-ordered",
    "lent_out": "Lent out",
    "borrowed": "Borrowed",
    "gifted_away": "Gifted away",
    "sold": "Sold",
    "lost": "Lost"
  },
  "lendDialog": {
    "title": "Lend this book",
    "friendIdLabel": "Friend's user ID",
    "orNameLabel": "Or a name",
    "submit": "Lend",
    "submitting": "Lending..."
  },
  "returnDialog": {
    "title": "Mark as returned?",
    "description": "This clears the lend record and keeps the book in your library.",
    "confirm": "Mark returned"
  }
},
"share": {
  "trigger": "Share",
  "dialogTitle": "Share with a friend",
  "friendIdLabel": "Friend's user ID",
  "messageLabel": "Message",
  "submit": "Send",
  "submitting": "Sending...",
  "success": "Shared!"
}
```

`messages/uk.json` — add the same structure with Ukrainian copy (mirror the existing
`uk.json` tone used for `catalog`/`profile`; exact wording is a translation task, not
a design decision — a native/fluent pass can follow up, use straightforward literal
Ukrainian translations of the English strings above as the initial values).

- [ ] **Step 2: Typecheck / lint messages are valid JSON**

Run: `pnpm lint` (catches malformed JSON via the messages import if referenced) and manually verify both files parse: `node -e "JSON.parse(require('fs').readFileSync('messages/en.json'))"` and same for `uk.json`.
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json messages/uk.json
git commit -m "feat(i18n): add collections/reviews/statuses/share message namespaces"
```

---

### Task 11: Install `@dnd-kit/core`

**Files:**

- Modify: `package.json`, `pnpm-lock.yaml`
- Modify: `pnpm-workspace.yaml` (only if the install triggers a build-script approval prompt)

- [ ] **Step 1: Install**

```bash
pnpm add @dnd-kit/core
```

- [ ] **Step 2: Check for a build-script approval prompt**

If pnpm reports a package needs build-script approval (same situation as `@parcel/watcher`/`@swc/core` in the existing `pnpm-workspace.yaml`), add it to `allowBuilds` in `pnpm-workspace.yaml` following the existing pattern (`"@dnd-kit/core": true`), then rerun `pnpm install`.

- [ ] **Step 3: Verify install**

Run: `pnpm typecheck`
Expected: no errors (nothing consumes the package yet).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "chore: add @dnd-kit/core for collection item reordering"
```

---

### Task 12: `components/collections/collection-card.tsx` + `collection-form.tsx`

**Files:**

- Create: `components/collections/collection-card.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/collections/collection-form.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**

- Consumes: `CollectionResponse` type; `useCreateCollection`, `useUpdateCollection` hooks (Task 6); `extractErrorMessage` from `lib/api/errors.ts`.
- Produces: `<CollectionCard collection={CollectionResponse} />` (links to `/collections/{id}`); `<CollectionForm collection?={CollectionResponse} onSuccess={() => void} />` (create when no `collection` prop, edit when present) — consumed by Task 16 (`app/(app)/collections/page.tsx`) and Task 17 (`app/(app)/collections/[id]/page.tsx`).

- [ ] **Step 1: Write `collection-card.test.tsx`**

```tsx
// components/collections/collection-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { CollectionCard } from "./collection-card";
import enMessages from "@/messages/en.json";
import type { CollectionResponse } from "@/lib/api/types";

const collection: CollectionResponse = {
  id: "c1",
  user_id: "u1",
  name: "Favorites",
  description: "My favorite reads",
  is_public: true,
  cover_image_url: null,
  sort_order: 0,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderCard(overrides: Partial<CollectionResponse> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <CollectionCard collection={{ ...collection, ...overrides }} />
    </NextIntlClientProvider>,
  );
}

describe("CollectionCard", () => {
  it("renders the name and description", () => {
    renderCard();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("My favorite reads")).toBeInTheDocument();
  });

  it("links to the collection detail page", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/collections/c1");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test collection-card`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `collection-card.tsx`**

```tsx
// components/collections/collection-card.tsx
"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CollectionResponse } from "@/lib/api/types";

export function CollectionCard({ collection }: { collection: CollectionResponse }) {
  return (
    <Link href={`/collections/${collection.id}`}>
      <Card className="hover:border-foreground/30 h-full transition-colors">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="line-clamp-2">{collection.name}</CardTitle>
          {collection.is_public && <Badge variant="secondary">Public</Badge>}
        </CardHeader>
        {collection.description && (
          <CardContent>
            <p className="text-muted-foreground line-clamp-3 text-sm">{collection.description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test collection-card`
Expected: PASS (2 tests)

- [ ] **Step 5: Write `collection-card.stories.tsx`**

```tsx
// components/collections/collection-card.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { CollectionCard } from "./collection-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CollectionCard> = {
  title: "Collections/CollectionCard",
  component: CollectionCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-xs">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseCollection = {
  id: "c1",
  user_id: "u1",
  name: "Favorites",
  description: "My favorite reads of all time.",
  is_public: true,
  cover_image_url: null,
  sort_order: 0,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Default: StoryObj<typeof CollectionCard> = { args: { collection: baseCollection } };
export const Private: StoryObj<typeof CollectionCard> = {
  args: { collection: { ...baseCollection, is_public: false } },
};
export const NoDescription: StoryObj<typeof CollectionCard> = {
  args: { collection: { ...baseCollection, description: null } },
};
```

- [ ] **Step 6: Write `collection-form.test.tsx`**

```tsx
// components/collections/collection-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { CollectionForm } from "./collection-form";
import enMessages from "@/messages/en.json";

function renderForm(props: Partial<React.ComponentProps<typeof CollectionForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <CollectionForm onSuccess={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("CollectionForm", () => {
  it("requires a name before submitting", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /create collection/i }));
    expect(screen.getByRole("button", { name: /create collection/i })).toBeDisabled();
  });

  it("submits a new collection and calls onSuccess", async () => {
    server.use(
      http.post("/api/collections", () =>
        HttpResponse.json({ id: "c1", name: "Favorites" }, { status: 201 }),
      ),
    );
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSuccess });
    await user.type(screen.getByLabelText(/name/i), "Favorites");
    await user.click(screen.getByRole("button", { name: /create collection/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("pre-fills fields when editing an existing collection", () => {
    renderForm({
      collection: {
        id: "c1",
        user_id: "u1",
        name: "Favorites",
        description: "desc",
        is_public: true,
        cover_image_url: null,
        sort_order: 0,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    });
    expect(screen.getByDisplayValue("Favorites")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test, verify fail**

Run: `pnpm test collection-form`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `collection-form.tsx`**

```tsx
// components/collections/collection-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateCollection, useUpdateCollection } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { extractErrorMessage } from "@/lib/api/errors";
import type { CollectionResponse } from "@/lib/api/types";

export function CollectionForm({
  collection,
  onSuccess,
}: {
  collection?: CollectionResponse;
  onSuccess: () => void;
}) {
  const t = useTranslations("collections.form");
  const isEditing = Boolean(collection);
  const [name, setName] = React.useState(collection?.name ?? "");
  const [description, setDescription] = React.useState(collection?.description ?? "");
  const [isPublic, setIsPublic] = React.useState(collection?.is_public ?? false);
  const [coverImageUrl, setCoverImageUrl] = React.useState(collection?.cover_image_url ?? "");

  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection(collection?.id ?? "");
  const mutation = isEditing ? updateCollection : createCollection;

  function handleSubmit() {
    const payload = {
      name,
      description: description || null,
      is_public: isPublic,
      cover_image_url: coverImageUrl || null,
    };
    mutation.mutate(payload as never, { onSuccess });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="collection-name" className="text-sm font-medium">
          {t("nameLabel")}
        </label>
        <Input id="collection-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="collection-description" className="text-sm font-medium">
          {t("descriptionLabel")}
        </label>
        <Textarea
          id="collection-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="collection-cover" className="text-sm font-medium">
          {t("coverImageLabel")}
        </label>
        <Input
          id="collection-cover"
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
        {t("isPublicLabel")}
      </label>
      {mutation.error && (
        <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
      )}
      <Button disabled={!name.trim() || mutation.isPending} onClick={handleSubmit}>
        {mutation.isPending ? t("submitting") : isEditing ? t("submitEdit") : t("submitCreate")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 9: Run test, verify pass**

Run: `pnpm test collection-form`
Expected: PASS (3 tests)

- [ ] **Step 10: Write `collection-form.stories.tsx`**

```tsx
// components/collections/collection-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CollectionForm } from "./collection-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CollectionForm> = {
  title: "Collections/CollectionForm",
  component: CollectionForm,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <div className="max-w-sm">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Create: StoryObj<typeof CollectionForm> = { args: { onSuccess: () => {} } };
export const Edit: StoryObj<typeof CollectionForm> = {
  args: {
    onSuccess: () => {},
    collection: {
      id: "c1",
      user_id: "u1",
      name: "Favorites",
      description: "My favorite reads",
      is_public: true,
      cover_image_url: null,
      sort_order: 0,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  },
};
```

- [ ] **Step 11: Commit**

```bash
git add components/collections/collection-card.tsx components/collections/collection-card.stories.tsx components/collections/collection-card.test.tsx components/collections/collection-form.tsx components/collections/collection-form.stories.tsx components/collections/collection-form.test.tsx
git commit -m "feat(collections): add CollectionCard and CollectionForm components"
```

---

### Task 13: `components/collections/collection-item-card.tsx` + `add-to-collection-dialog.tsx`

**Files:**

- Create: `components/collections/collection-item-card.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/collections/add-to-collection-dialog.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**

- Consumes: `CollectionItemResponse` type; `useUpdateCollectionItem`, `useRemoveCollectionItem` (Task 6, item card); `useCollections`, `useAddCollectionItem`, `useCreateCollection` (Task 6, add-dialog).
- Produces: `<CollectionItemCard item={CollectionItemResponse} onMoveUp={() => void} onMoveDown={() => void} isFirst={boolean} isLast={boolean} onRemove={() => void} onNoteChange={(note: string) => void} />` (pure/controlled — parent owns reorder state, see Task 17); `<AddToCollectionDialog bookId?={string} releaseId?={string} />` — consumed by Task 17 (collection detail page) and Task 18 (book detail page "Add to collection" button).

- [ ] **Step 1: Write `collection-item-card.test.tsx`**

```tsx
// components/collections/collection-item-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { CollectionItemCard } from "./collection-item-card";
import enMessages from "@/messages/en.json";
import type { CollectionItemResponse } from "@/lib/api/types";

const item: CollectionItemResponse = {
  id: "i1",
  collection_id: "c1",
  book_id: "b1",
  release_id: null,
  position: 0,
  added_at: "2020-01-01T00:00:00Z",
  note: "Great read",
};

function renderItem(props: Partial<React.ComponentProps<typeof CollectionItemCard>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <CollectionItemCard
        item={item}
        isFirst={false}
        isLast={false}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("CollectionItemCard", () => {
  it("renders the note", () => {
    renderItem();
    expect(screen.getByText("Great read")).toBeInTheDocument();
  });

  it("disables move up when isFirst", () => {
    renderItem({ isFirst: true });
    expect(screen.getByRole("button", { name: /move up/i })).toBeDisabled();
  });

  it("disables move down when isLast", () => {
    renderItem({ isLast: true });
    expect(screen.getByRole("button", { name: /move down/i })).toBeDisabled();
  });

  it("calls onRemove when remove is clicked", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderItem({ onRemove });
    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("calls onMoveUp/onMoveDown", async () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const user = userEvent.setup();
    renderItem({ onMoveUp, onMoveDown });
    await user.click(screen.getByRole("button", { name: /move up/i }));
    await user.click(screen.getByRole("button", { name: /move down/i }));
    expect(onMoveUp).toHaveBeenCalled();
    expect(onMoveDown).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test collection-item-card`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `collection-item-card.tsx`**

Note: per the user's decision to use `@dnd-kit/core` instead of plain move buttons, this component still exposes move-up/move-down handlers as an accessible fallback (keyboard users, screen readers) alongside drag — `@dnd-kit` is wired at the list level in Task 17, this card stays a plain controlled component so it's independently testable per the design-for-isolation principle.

```tsx
// components/collections/collection-item-card.tsx
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUpIcon, ChevronDownIcon, XIcon } from "lucide-react";
import type { CollectionItemResponse } from "@/lib/api/types";

export function CollectionItemCard({
  item,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  item: CollectionItemResponse;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("collections.detail");

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{item.book_id ?? item.release_id}</p>
          {item.note && <p className="text-muted-foreground text-sm">{item.note}</p>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label={t("moveUp")}
          >
            <ChevronUpIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label={t("moveDown")}
          >
            <ChevronDownIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={t("removeItem")}>
            <XIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test collection-item-card`
Expected: PASS (5 tests)

- [ ] **Step 5: Write `collection-item-card.stories.tsx`**

```tsx
// components/collections/collection-item-card.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { CollectionItemCard } from "./collection-item-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CollectionItemCard> = {
  title: "Collections/CollectionItemCard",
  component: CollectionItemCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-sm">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseItem = {
  id: "i1",
  collection_id: "c1",
  book_id: "b1",
  release_id: null,
  position: 0,
  added_at: "2020-01-01T00:00:00Z",
  note: "Great read",
};

export const Default: StoryObj<typeof CollectionItemCard> = {
  args: {
    item: baseItem,
    isFirst: false,
    isLast: false,
    onMoveUp: () => {},
    onMoveDown: () => {},
    onRemove: () => {},
  },
};
export const FirstItem: StoryObj<typeof CollectionItemCard> = {
  args: { ...Default.args, isFirst: true },
};
export const LastItem: StoryObj<typeof CollectionItemCard> = {
  args: { ...Default.args, isLast: true },
};
```

- [ ] **Step 6: Write `add-to-collection-dialog.test.tsx`**

```tsx
// components/collections/add-to-collection-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof AddToCollectionDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AddToCollectionDialog bookId="b1" {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("AddToCollectionDialog", () => {
  it("lists the user's collections and adds the book on selection", async () => {
    server.use(
      http.get("/api/collections", () =>
        HttpResponse.json({
          items: [{ id: "c1", name: "Favorites" }],
          total: 1,
          limit: 10,
          offset: 0,
        }),
      ),
      http.post("/api/collections/:id/items", () =>
        HttpResponse.json({ id: "i1", collection_id: "c1", book_id: "b1" }, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /add to collection/i }));
    await waitFor(() => expect(screen.getByText("Favorites")).toBeInTheDocument());
    await user.click(screen.getByText("Favorites"));
    await waitFor(() => expect(screen.getByText(/added to favorites/i)).toBeInTheDocument());
  });

  it("shows an empty state when the user has no collections", async () => {
    server.use(
      http.get("/api/collections", () =>
        HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 }),
      ),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /add to collection/i }));
    await waitFor(() =>
      expect(screen.getByText(/don't have any collections/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 7: Run test, verify fail**

Run: `pnpm test add-to-collection-dialog`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `add-to-collection-dialog.tsx`**

```tsx
// components/collections/add-to-collection-dialog.tsx
"use client";

import { useTranslations } from "next-intl";
import { useCollections, useAddCollectionItem } from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

function AddToCollectionItem({
  collectionId,
  collectionName,
  bookId,
  releaseId,
}: {
  collectionId: string;
  collectionName: string;
  bookId?: string;
  releaseId?: string;
}) {
  const t = useTranslations("collections.addToCollection");
  const addItem = useAddCollectionItem(collectionId);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="hover:bg-accent rounded-md p-2 text-left text-sm"
        onClick={() => addItem.mutate({ book_id: bookId ?? null, release_id: releaseId ?? null })}
      >
        {collectionName}
      </button>
      {addItem.isSuccess && (
        <p className="text-muted-foreground text-xs">{t("added", { name: collectionName })}</p>
      )}
      {addItem.error && (
        <p className="text-destructive text-xs">{extractErrorMessage(addItem.error)}</p>
      )}
    </div>
  );
}

export function AddToCollectionDialog({
  bookId,
  releaseId,
}: {
  bookId?: string;
  releaseId?: string;
}) {
  const t = useTranslations("collections.addToCollection");
  const { data: collectionsPage } = useCollections();
  const collections = collectionsPage?.items ?? [];

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        {collections.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noCollections")}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {collections.map((collection) => (
              <AddToCollectionItem
                key={collection.id}
                collectionId={collection.id}
                collectionName={collection.name}
                bookId={bookId}
                releaseId={releaseId}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 9: Run test, verify pass**

Run: `pnpm test add-to-collection-dialog`
Expected: PASS (2 tests)

- [ ] **Step 10: Write `add-to-collection-dialog.stories.tsx`**

```tsx
// components/collections/add-to-collection-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof AddToCollectionDialog> = {
  title: "Collections/AddToCollectionDialog",
  component: AddToCollectionDialog,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <Story />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Default: StoryObj<typeof AddToCollectionDialog> = { args: { bookId: "b1" } };
```

- [ ] **Step 11: Commit**

```bash
git add components/collections/collection-item-card.tsx components/collections/collection-item-card.stories.tsx components/collections/collection-item-card.test.tsx components/collections/add-to-collection-dialog.tsx components/collections/add-to-collection-dialog.stories.tsx components/collections/add-to-collection-dialog.test.tsx
git commit -m "feat(collections): add CollectionItemCard and AddToCollectionDialog components"
```

---

### Task 14: `components/reviews/review-card.tsx` + `review-list.tsx` (retires `components/catalog/review-list.tsx`)

**Files:**

- Create: `components/reviews/review-card.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/reviews/review-list.tsx`, `.stories.tsx`, `.test.tsx`
- Delete: `components/catalog/review-list.tsx`, `components/catalog/review-list.stories.tsx`, `components/catalog/review-list.test.tsx`

**Interfaces:**

- Consumes: `ReviewResponse` type; `useDeleteReview` (Task 7).
- Produces: `<ReviewCard review={ReviewResponse} currentUserId?={string} onEdit={() => void} />` (shows edit/delete only when `review.user_id === currentUserId`); `<ReviewList reviews={ReviewResponse[]} isLoading={boolean} currentUserId?={string} onEdit={(review: ReviewResponse) => void} />` — consumed by Task 18 (book detail page) and Task 15 (my-reviews page). This directly replaces Block 2's `components/catalog/review-list.tsx` per the approved spec addendum.

- [ ] **Step 1: Write `review-card.test.tsx`**

```tsx
// components/reviews/review-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewCard } from "./review-card";
import enMessages from "@/messages/en.json";
import type { ReviewResponse } from "@/lib/api/types";

const review: ReviewResponse = {
  id: "r1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  rating: 5,
  title: "Loved it",
  body: "A great read.",
  is_public: true,
  contains_spoilers: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderCard(props: Partial<React.ComponentProps<typeof ReviewCard>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReviewCard review={review} onEdit={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReviewCard", () => {
  it("renders title, rating, and body", () => {
    renderCard();
    expect(screen.getByText("Loved it")).toBeInTheDocument();
    expect(screen.getByText("A great read.")).toBeInTheDocument();
  });

  it("shows a spoiler badge when contains_spoilers is true", () => {
    renderCard({ review: { ...review, contains_spoilers: true } });
    expect(screen.getByText(/contains spoilers/i)).toBeInTheDocument();
  });

  it("shows edit/delete actions only for the review's own author", () => {
    renderCard({ currentUserId: "u1" });
    expect(screen.getByRole("button", { name: /delete review/i })).toBeInTheDocument();
  });

  it("hides edit/delete actions for other users", () => {
    renderCard({ currentUserId: "someone-else" });
    expect(screen.queryByRole("button", { name: /delete review/i })).not.toBeInTheDocument();
  });

  it("calls onEdit when edit is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    renderCard({ currentUserId: "u1", onEdit });
    await user.click(screen.getByRole("button", { name: /edit review/i }));
    expect(onEdit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test review-card`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `review-card.tsx`**

```tsx
// components/reviews/review-card.tsx
"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarIcon } from "lucide-react";
import { useDeleteReview } from "@/hooks/useReviews";
import type { ReviewResponse } from "@/lib/api/types";

export function ReviewCard({
  review,
  currentUserId,
  onEdit,
}: {
  review: ReviewResponse;
  currentUserId?: string;
  onEdit: () => void;
}) {
  const t = useTranslations("reviews");
  const deleteReview = useDeleteReview();
  const isOwnReview = currentUserId !== undefined && review.user_id === currentUserId;

  return (
    <div className="border-border flex flex-col gap-1 border-b pb-4 last:border-b-0">
      <div className="flex items-center gap-2">
        {review.rating !== null && (
          <span className="flex items-center gap-0.5 text-sm">
            <StarIcon className="size-3.5 fill-current" />
            {review.rating}
          </span>
        )}
        {review.title && <p className="font-medium">{review.title}</p>}
        {review.contains_spoilers && <Badge variant="outline">{t("spoilerWarning")}</Badge>}
      </div>
      {review.body && <p className="text-muted-foreground text-sm">{review.body}</p>}
      {isOwnReview && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            {t("editReview")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteReview.mutate(review.id)}
            disabled={deleteReview.isPending}
          >
            {t("deleteReview")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test review-card`
Expected: PASS (5 tests)

- [ ] **Step 5: Write `review-card.stories.tsx`**

```tsx
// components/reviews/review-card.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewCard } from "./review-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewCard> = {
  title: "Reviews/ReviewCard",
  component: ReviewCard,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <div className="max-w-md">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

const baseReview = {
  id: "r1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  rating: 5,
  title: "Loved it",
  body: "A great read from start to finish.",
  is_public: true,
  contains_spoilers: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const AsViewer: StoryObj<typeof ReviewCard> = {
  args: { review: baseReview, onEdit: () => {} },
};
export const AsAuthor: StoryObj<typeof ReviewCard> = {
  args: { review: baseReview, currentUserId: "u1", onEdit: () => {} },
};
export const WithSpoilerWarning: StoryObj<typeof ReviewCard> = {
  args: { review: { ...baseReview, contains_spoilers: true }, onEdit: () => {} },
};
```

- [ ] **Step 6: Write `review-list.test.tsx`**

```tsx
// components/reviews/review-list.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";
import type { ReviewResponse } from "@/lib/api/types";

function renderList(props: Partial<React.ComponentProps<typeof ReviewList>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReviewList reviews={[]} isLoading={false} onEdit={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReviewList", () => {
  it("shows a loading state", () => {
    renderList({ isLoading: true });
    expect(screen.getByText(/loading reviews/i)).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    renderList({ reviews: [] });
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it("renders a review card per review", () => {
    const reviews: ReviewResponse[] = [
      {
        id: "r1",
        user_id: "u1",
        book_id: "b1",
        release_id: null,
        rating: 4,
        title: "Good",
        body: "Solid.",
        is_public: true,
        contains_spoilers: false,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    ];
    renderList({ reviews });
    expect(screen.getByText("Good")).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test, verify fail**

Run: `pnpm test review-list`
Expected: FAIL — module not found (or picks up the old `components/catalog/review-list.test.tsx` still passing; that's fine, they coexist until Step 10 deletes the old one).

- [ ] **Step 8: Implement `review-list.tsx`**

```tsx
// components/reviews/review-list.tsx
"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCard } from "./review-card";
import type { ReviewResponse } from "@/lib/api/types";

export function ReviewList({
  reviews,
  isLoading,
  currentUserId,
  onEdit,
}: {
  reviews: ReviewResponse[];
  isLoading: boolean;
  currentUserId?: string;
  onEdit: (review: ReviewResponse) => void;
}) {
  const t = useTranslations("reviews");

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label={t("loading")}>
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          currentUserId={currentUserId}
          onEdit={() => onEdit(review)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 9: Run test, verify pass**

Run: `pnpm test review-list`
Expected: PASS (3 tests)

- [ ] **Step 10: Delete Block 2's old review-list and write the new story file**

```bash
git rm components/catalog/review-list.tsx components/catalog/review-list.stories.tsx components/catalog/review-list.test.tsx
```

```tsx
// components/reviews/review-list.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewList> = {
  title: "Reviews/ReviewList",
  component: ReviewList,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <div className="max-w-md">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Loading: StoryObj<typeof ReviewList> = {
  args: { reviews: [], isLoading: true, onEdit: () => {} },
};
export const Empty: StoryObj<typeof ReviewList> = {
  args: { reviews: [], isLoading: false, onEdit: () => {} },
};
export const WithReviews: StoryObj<typeof ReviewList> = {
  args: {
    isLoading: false,
    onEdit: () => {},
    reviews: [
      {
        id: "r1",
        user_id: "u1",
        book_id: "b1",
        release_id: null,
        rating: 5,
        title: "Loved it",
        body: "A great read.",
        is_public: true,
        contains_spoilers: false,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    ],
  },
};
```

- [ ] **Step 11: This block's book-detail page (`app/(app)/books/[id]/page.tsx`) currently imports `ReviewList` from `components/catalog/review-list` — this import gets updated in Task 18, not here.** No action needed in this task beyond noting the dependency; do not update the page yet.

- [ ] **Step 12: Run full test suite to confirm nothing else references the deleted file**

Run: `pnpm test`
Expected: FAIL only on `app/(app)/books/[id]/page.tsx`-related tests, if any, due to the now-missing import — this is expected and fixed by Task 18. If no test currently imports the book detail page directly, this step should otherwise PASS.

- [ ] **Step 13: Commit**

```bash
git add components/reviews/
git commit -m "feat(reviews): add ReviewCard and ReviewList, retire catalog's read-only review-list"
```

---

### Task 15: `components/reviews/review-form.tsx`

**Files:**

- Create: `components/reviews/review-form.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**

- Consumes: `useCreateReview`, `useUpdateReview` (Task 7); `extractErrorMessage`.
- Produces: `<ReviewForm bookId?={string} releaseId?={string} review?={ReviewResponse} onSuccess={() => void} />` (create mode needs exactly one of `bookId`/`releaseId`; edit mode takes `review` and ignores id props) — consumed by Task 18 (book detail "write a review") and Task 16 (my-reviews management view, edit mode).

- [ ] **Step 1: Write `review-form.test.tsx`**

```tsx
// components/reviews/review-form.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ReviewForm } from "./review-form";
import enMessages from "@/messages/en.json";

function renderForm(props: Partial<React.ComponentProps<typeof ReviewForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReviewForm bookId="b1" onSuccess={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReviewForm", () => {
  it("submits a new review with rating and body", async () => {
    server.use(
      http.post("/api/reviews", () => HttpResponse.json({ id: "r1", rating: 5 }, { status: 201 })),
    );
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSuccess });
    await user.click(screen.getByRole("radio", { name: "5" }));
    await user.type(screen.getByLabelText(/review/i), "Great book.");
    await user.click(screen.getByRole("button", { name: /post review/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("pre-fills fields when editing an existing review", () => {
    renderForm({
      bookId: undefined,
      review: {
        id: "r1",
        user_id: "u1",
        book_id: "b1",
        release_id: null,
        rating: 4,
        title: "Good",
        body: "Solid read.",
        is_public: true,
        contains_spoilers: false,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    });
    expect(screen.getByDisplayValue("Solid read.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("surfaces the exactly-one-of-book-or-release 422 as a form-level error", async () => {
    server.use(
      http.post("/api/reviews", () =>
        HttpResponse.json(
          {
            detail: [
              {
                msg: "Value error, exactly one of book_id or release_id is required",
                loc: ["body"],
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /post review/i }));
    await waitFor(() =>
      expect(screen.getByText(/pick a book or a specific edition/i)).toBeInTheDocument(),
    );
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test review-form`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `review-form.tsx`**

Note: `extractErrorMessage` returns the raw backend string for a 422 array-shaped
`detail`, which falls through to the generic "Something went wrong" fallback (see
`lib/api/errors.ts` Step — it only special-cases string `detail`, not the array
form). Since this specific 422 is common and has a known cause here, detect it
explicitly rather than relying on the generic extractor.

```tsx
// components/reviews/review-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCreateReview, useUpdateReview } from "@/hooks/useReviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { extractErrorMessage, isAxiosError } from "@/lib/api/errors";
import type { ReviewResponse } from "@/lib/api/types";

const RATINGS = [1, 2, 3, 4, 5];

function isExactlyOneOfError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
  return (
    Array.isArray(detail) &&
    detail.some((d) => typeof d?.msg === "string" && d.msg.includes("exactly one of"))
  );
}

export function ReviewForm({
  bookId,
  releaseId,
  review,
  onSuccess,
}: {
  bookId?: string;
  releaseId?: string;
  review?: ReviewResponse;
  onSuccess: () => void;
}) {
  const t = useTranslations("reviews.form");
  const isEditing = Boolean(review);
  const [rating, setRating] = React.useState<number | null>(review?.rating ?? null);
  const [title, setTitle] = React.useState(review?.title ?? "");
  const [body, setBody] = React.useState(review?.body ?? "");
  const [isPublic, setIsPublic] = React.useState(review?.is_public ?? true);
  const [containsSpoilers, setContainsSpoilers] = React.useState(
    review?.contains_spoilers ?? false,
  );

  const createReview = useCreateReview();
  const updateReview = useUpdateReview(review?.id ?? "");
  const mutation = isEditing ? updateReview : createReview;

  function handleSubmit() {
    if (isEditing) {
      updateReview.mutate(
        {
          rating,
          title: title || null,
          body: body || null,
          is_public: isPublic,
          contains_spoilers: containsSpoilers,
        },
        { onSuccess },
      );
      return;
    }
    createReview.mutate(
      {
        book_id: bookId ?? null,
        release_id: releaseId ?? null,
        rating,
        title: title || null,
        body: body || null,
        is_public: isPublic,
        contains_spoilers: containsSpoilers,
      },
      { onSuccess },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">{t("ratingLabel")}</legend>
        <div className="flex gap-2">
          {RATINGS.map((value) => (
            <label key={value} className="flex items-center gap-1 text-sm">
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <Input id="review-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="review-body" className="text-sm font-medium">
          {t("bodyLabel")}
        </label>
        <Textarea id="review-body" value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
        {t("isPublicLabel")}
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={containsSpoilers}
          onCheckedChange={(checked) => setContainsSpoilers(checked === true)}
        />
        {t("containsSpoilersLabel")}
      </label>
      {mutation.error && (
        <p className="text-destructive text-sm">
          {isExactlyOneOfError(mutation.error)
            ? t("exactlyOneRequired")
            : extractErrorMessage(mutation.error)}
        </p>
      )}
      <Button disabled={mutation.isPending} onClick={handleSubmit}>
        {mutation.isPending ? t("submitting") : isEditing ? t("submitEdit") : t("submitCreate")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test review-form`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `review-form.stories.tsx`**

```tsx
// components/reviews/review-form.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewForm } from "./review-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewForm> = {
  title: "Reviews/ReviewForm",
  component: ReviewForm,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <div className="max-w-md">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Create: StoryObj<typeof ReviewForm> = { args: { bookId: "b1", onSuccess: () => {} } };
export const Edit: StoryObj<typeof ReviewForm> = {
  args: {
    onSuccess: () => {},
    review: {
      id: "r1",
      user_id: "u1",
      book_id: "b1",
      release_id: null,
      rating: 4,
      title: "Good",
      body: "Solid read.",
      is_public: true,
      contains_spoilers: false,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add components/reviews/review-form.tsx components/reviews/review-form.stories.tsx components/reviews/review-form.test.tsx
git commit -m "feat(reviews): add ReviewForm component"
```

---

### Task 16: `components/statuses/status-badge.tsx` + `status-list-item.tsx`

**Files:**

- Create: `components/statuses/status-badge.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/statuses/status-list-item.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**

- Consumes: `BookStatusResponse`, `BookStatusKind` types.
- Produces: `<StatusBadge status={BookStatusKind} />`; `<StatusListItem status={BookStatusResponse} onChangeStatus={() => void} onLend={() => void} onReturn={() => void} />` (shows "Lend to..." only for `owned`/`wishlist`-ish states with no active lend, "Mark returned" only for `lent_out`) — consumed by Task 19 (`app/(app)/library/page.tsx`).

- [ ] **Step 1: Write `status-badge.test.tsx`**

```tsx
// components/statuses/status-badge.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { StatusBadge } from "./status-badge";
import enMessages from "@/messages/en.json";

describe("StatusBadge", () => {
  it("renders the localized label for a status kind", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <StatusBadge status="lent_out" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Lent out")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test status-badge`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `status-badge.tsx`**

```tsx
// components/statuses/status-badge.tsx
"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { BookStatusKind } from "@/lib/api/types";

export function StatusBadge({ status }: { status: BookStatusKind }) {
  const t = useTranslations("statuses.kind");
  return <Badge variant="secondary">{t(status)}</Badge>;
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test status-badge`
Expected: PASS (1 test)

- [ ] **Step 5: Write `status-badge.stories.tsx`**

```tsx
// components/statuses/status-badge.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { StatusBadge } from "./status-badge";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof StatusBadge> = {
  title: "Statuses/StatusBadge",
  component: StatusBadge,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

export const Owned: StoryObj<typeof StatusBadge> = { args: { status: "owned" } };
export const Wishlist: StoryObj<typeof StatusBadge> = { args: { status: "wishlist" } };
export const LentOut: StoryObj<typeof StatusBadge> = { args: { status: "lent_out" } };
export const Borrowed: StoryObj<typeof StatusBadge> = { args: { status: "borrowed" } };
```

- [ ] **Step 6: Write `status-list-item.test.tsx`**

```tsx
// components/statuses/status-list-item.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { StatusListItem } from "./status-list-item";
import enMessages from "@/messages/en.json";
import type { BookStatusResponse } from "@/lib/api/types";

const baseStatus: BookStatusResponse = {
  id: "s1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  status: "owned",
  acquired_at: "2020-01-01T00:00:00Z",
  notes: null,
  lent_to_user_id: null,
  lent_to_name: null,
  lent_at: null,
  returned_at: null,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderItem(props: Partial<React.ComponentProps<typeof StatusListItem>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <StatusListItem
        status={baseStatus}
        onChangeStatus={vi.fn()}
        onLend={vi.fn()}
        onReturn={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("StatusListItem", () => {
  it("shows a lend action for an owned book", () => {
    renderItem();
    expect(screen.getByRole("button", { name: /lend to/i })).toBeInTheDocument();
  });

  it("shows a return action for a lent-out book, not a lend action", () => {
    renderItem({ status: { ...baseStatus, status: "lent_out", lent_to_name: "Alex" } });
    expect(screen.getByRole("button", { name: /mark returned/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lend to/i })).not.toBeInTheDocument();
  });

  it("calls onChangeStatus when change-status is clicked", async () => {
    const onChangeStatus = vi.fn();
    const user = userEvent.setup();
    renderItem({ onChangeStatus });
    await user.click(screen.getByRole("button", { name: /change status/i }));
    expect(onChangeStatus).toHaveBeenCalled();
  });
});
```

- [ ] **Step 7: Run test, verify fail**

Run: `pnpm test status-list-item`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `status-list-item.tsx`**

```tsx
// components/statuses/status-list-item.tsx
"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import type { BookStatusResponse } from "@/lib/api/types";

export function StatusListItem({
  status,
  onChangeStatus,
  onLend,
  onReturn,
}: {
  status: BookStatusResponse;
  onChangeStatus: () => void;
  onLend: () => void;
  onReturn: () => void;
}) {
  const t = useTranslations("statuses");
  const canLend = status.status === "owned" || status.status === "wishlist";
  const isLentOut = status.status === "lent_out";

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{status.book_id ?? status.release_id}</p>
          <StatusBadge status={status.status} />
          {status.lent_to_name && (
            <p className="text-muted-foreground text-xs">{status.lent_to_name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onChangeStatus}>
            {t("changeStatus")}
          </Button>
          {canLend && (
            <Button variant="ghost" size="sm" onClick={onLend}>
              {t("lendAction")}
            </Button>
          )}
          {isLentOut && (
            <Button variant="ghost" size="sm" onClick={onReturn}>
              {t("returnAction")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 9: Run test, verify pass**

Run: `pnpm test status-list-item`
Expected: PASS (3 tests)

- [ ] **Step 10: Write `status-list-item.stories.tsx`**

```tsx
// components/statuses/status-list-item.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { StatusListItem } from "./status-list-item";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof StatusListItem> = {
  title: "Statuses/StatusListItem",
  component: StatusListItem,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-md">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseStatus = {
  id: "s1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  status: "owned" as const,
  acquired_at: "2020-01-01T00:00:00Z",
  notes: null,
  lent_to_user_id: null,
  lent_to_name: null,
  lent_at: null,
  returned_at: null,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Owned: StoryObj<typeof StatusListItem> = {
  args: { status: baseStatus, onChangeStatus: () => {}, onLend: () => {}, onReturn: () => {} },
};
export const LentOut: StoryObj<typeof StatusListItem> = {
  args: {
    status: { ...baseStatus, status: "lent_out", lent_to_name: "Alex" },
    onChangeStatus: () => {},
    onLend: () => {},
    onReturn: () => {},
  },
};
```

- [ ] **Step 11: Commit**

```bash
git add components/statuses/status-badge.tsx components/statuses/status-badge.stories.tsx components/statuses/status-badge.test.tsx components/statuses/status-list-item.tsx components/statuses/status-list-item.stories.tsx components/statuses/status-list-item.test.tsx
git commit -m "feat(statuses): add StatusBadge and StatusListItem components"
```

---

### Task 17: `components/statuses/lend-dialog.tsx` + `return-confirm-dialog.tsx`

**Files:**

- Create: `components/statuses/lend-dialog.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/statuses/return-confirm-dialog.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**

- Consumes: `useLendStatus`, `useReturnStatus` (Task 8); `extractErrorMessage`.
- Produces: `<LendDialog statusId={string} open={boolean} onOpenChange={(open: boolean) => void} />`; `<ReturnConfirmDialog statusId={string} open={boolean} onOpenChange={(open: boolean) => void} />` — consumed by Task 19 (`app/(app)/library/page.tsx`).

- [ ] **Step 1: Write `lend-dialog.test.tsx`**

```tsx
// components/statuses/lend-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { LendDialog } from "./lend-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof LendDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <LendDialog statusId="s1" open={true} onOpenChange={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("LendDialog", () => {
  it("lends to a free-text name and calls onOpenChange(false) on success", async () => {
    server.use(
      http.post("/api/me/statuses/:id/lend", () =>
        HttpResponse.json({ id: "s1", status: "lent_out", lent_to_name: "Alex" }),
      ),
    );
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });
    await user.type(screen.getByLabelText(/or a name/i), "Alex");
    await user.click(screen.getByRole("button", { name: /^lend$/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
```

- [ ] **Step 2: Run test, verify fail**

Run: `pnpm test lend-dialog`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lend-dialog.tsx`**

```tsx
// components/statuses/lend-dialog.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLendStatus } from "@/hooks/useStatuses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function LendDialog({
  statusId,
  open,
  onOpenChange,
}: {
  statusId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("statuses.lendDialog");
  const [friendUserId, setFriendUserId] = React.useState("");
  const [friendName, setFriendName] = React.useState("");
  const lendStatus = useLendStatus(statusId);

  function handleSubmit() {
    lendStatus.mutate(
      { lent_to_user_id: friendUserId || null, lent_to_name: friendName || null },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lend-friend-id" className="text-sm font-medium">
              {t("friendIdLabel")}
            </label>
            <Input
              id="lend-friend-id"
              value={friendUserId}
              onChange={(e) => setFriendUserId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lend-friend-name" className="text-sm font-medium">
              {t("orNameLabel")}
            </label>
            <Input
              id="lend-friend-name"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
            />
          </div>
          {lendStatus.error && (
            <p className="text-destructive text-sm">{extractErrorMessage(lendStatus.error)}</p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={lendStatus.isPending} onClick={handleSubmit}>
            {lendStatus.isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm test lend-dialog`
Expected: PASS (1 test)

- [ ] **Step 5: Write `lend-dialog.stories.tsx`**

```tsx
// components/statuses/lend-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LendDialog } from "./lend-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof LendDialog> = {
  title: "Statuses/LendDialog",
  component: LendDialog,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <Story />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Default: StoryObj<typeof LendDialog> = {
  args: { statusId: "s1", open: true, onOpenChange: () => {} },
};
```

- [ ] **Step 6: Write `return-confirm-dialog.test.tsx`**

```tsx
// components/statuses/return-confirm-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ReturnConfirmDialog } from "./return-confirm-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof ReturnConfirmDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReturnConfirmDialog statusId="s1" open={true} onOpenChange={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReturnConfirmDialog", () => {
  it("confirms the return and calls onOpenChange(false) on success", async () => {
    server.use(
      http.post("/api/me/statuses/:id/return", () =>
        HttpResponse.json({ id: "s1", status: "owned" }),
      ),
    );
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderDialog({ onOpenChange });
    await user.click(screen.getByRole("button", { name: /mark returned/i }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
```

- [ ] **Step 7: Run test, verify fail**

Run: `pnpm test return-confirm-dialog`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `return-confirm-dialog.tsx`**

```tsx
// components/statuses/return-confirm-dialog.tsx
"use client";

import { useTranslations } from "next-intl";
import { useReturnStatus } from "@/hooks/useStatuses";
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

export function ReturnConfirmDialog({
  statusId,
  open,
  onOpenChange,
}: {
  statusId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("statuses.returnDialog");
  const returnStatus = useReturnStatus(statusId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {returnStatus.error && (
          <p className="text-destructive text-sm">{extractErrorMessage(returnStatus.error)}</p>
        )}
        <DialogFooter>
          <Button
            disabled={returnStatus.isPending}
            onClick={() => returnStatus.mutate(undefined, { onSuccess: () => onOpenChange(false) })}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 9: Run test, verify pass**

Run: `pnpm test return-confirm-dialog`
Expected: PASS (1 test)

- [ ] **Step 10: Write `return-confirm-dialog.stories.tsx`**

```tsx
// components/statuses/return-confirm-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReturnConfirmDialog } from "./return-confirm-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReturnConfirmDialog> = {
  title: "Statuses/ReturnConfirmDialog",
  component: ReturnConfirmDialog,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <Story />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Default: StoryObj<typeof ReturnConfirmDialog> = {
  args: { statusId: "s1", open: true, onOpenChange: () => {} },
};
```

- [ ] **Step 11: Commit**

```bash
git add components/statuses/lend-dialog.tsx components/statuses/lend-dialog.stories.tsx components/statuses/lend-dialog.test.tsx components/statuses/return-confirm-dialog.tsx components/statuses/return-confirm-dialog.stories.tsx components/statuses/return-confirm-dialog.test.tsx
git commit -m "feat(statuses): add LendDialog and ReturnConfirmDialog components"
```

---

### Task 18: `components/share/share-dialog.tsx`

**Files:**

- Create: `components/share/share-dialog.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**

- Consumes: `useShareBook`, `useShareCollection` (Task 9); `sonner`'s `toast` (already a dependency, see `components/ui/sonner.tsx`); `extractErrorMessage`.
- Produces: `<ShareDialog kind="book" | "collection" targetId={string} />` (self-contained trigger button + dialog) — consumed by Task 18 (book detail page) and Task 17 (collection detail page).

- [ ] **Step 1: Check how `toast` is imported elsewhere in the repo before use**

Run: `grep -rn "from \"sonner\"" --include="*.tsx" .` to confirm the exact import path used by existing code (likely `import { toast } from "sonner"` directly, with `components/ui/sonner.tsx` only providing the `<Toaster />` mount point).

- [ ] **Step 2: Write `share-dialog.test.tsx`**

```tsx
// components/share/share-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ShareDialog } from "./share-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof ShareDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ShareDialog kind="book" targetId="b1" {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ShareDialog", () => {
  it("shares a book with a friend and message", async () => {
    server.use(
      http.post("/api/share/book/:id", () => HttpResponse.json({ id: "m1", thread_id: "t1" })),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /^share$/i }));
    await user.type(screen.getByLabelText(/friend's user id/i), "f1");
    await user.type(screen.getByLabelText(/message/i), "check this out");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("shares a collection when kind is collection", async () => {
    server.use(
      http.post("/api/share/collection/:id", () =>
        HttpResponse.json({ id: "m1", thread_id: "t1" }),
      ),
    );
    const user = userEvent.setup();
    renderDialog({ kind: "collection", targetId: "c1" });
    await user.click(screen.getByRole("button", { name: /^share$/i }));
    await user.type(screen.getByLabelText(/friend's user id/i), "f1");
    await user.type(screen.getByLabelText(/message/i), "check this out");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test, verify fail**

Run: `pnpm test share-dialog`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `share-dialog.tsx`**

Adjust the `toast` import to match whatever Step 1 found (default assumed below is
direct `sonner` import, matching the library's own idiom):

```tsx
// components/share/share-dialog.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useShareBook, useShareCollection } from "@/hooks/useShare";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { extractErrorMessage } from "@/lib/api/errors";

export function ShareDialog({ kind, targetId }: { kind: "book" | "collection"; targetId: string }) {
  const t = useTranslations("share");
  const [open, setOpen] = React.useState(false);
  const [friendId, setFriendId] = React.useState("");
  const [message, setMessage] = React.useState("");

  const shareBook = useShareBook();
  const shareCollection = useShareCollection();
  const mutation = kind === "book" ? shareBook : shareCollection;

  function handleSubmit() {
    const payload = { friend_id: friendId, message };
    const args =
      kind === "book" ? { bookId: targetId, payload } : { collectionId: targetId, payload };
    mutation.mutate(args as never, {
      onSuccess: () => {
        toast.success(t("success"));
        setOpen(false);
        setFriendId("");
        setMessage("");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>{t("trigger")}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="share-friend-id" className="text-sm font-medium">
              {t("friendIdLabel")}
            </label>
            <Input
              id="share-friend-id"
              value={friendId}
              onChange={(e) => setFriendId(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="share-message" className="text-sm font-medium">
              {t("messageLabel")}
            </label>
            <Textarea
              id="share-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          {mutation.error && (
            <p className="text-destructive text-sm">{extractErrorMessage(mutation.error)}</p>
          )}
        </div>
        <DialogFooter>
          <Button disabled={!friendId || mutation.isPending} onClick={handleSubmit}>
            {mutation.isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Run test, verify pass**

Run: `pnpm test share-dialog`
Expected: PASS (2 tests)

- [ ] **Step 6: Write `share-dialog.stories.tsx`**

```tsx
// components/share/share-dialog.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShareDialog } from "./share-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ShareDialog> = {
  title: "Share/ShareDialog",
  component: ShareDialog,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <Story />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const ShareBook: StoryObj<typeof ShareDialog> = { args: { kind: "book", targetId: "b1" } };
export const ShareCollection: StoryObj<typeof ShareDialog> = {
  args: { kind: "collection", targetId: "c1" },
};
```

- [ ] **Step 7: Commit**

```bash
git add components/share/
git commit -m "feat(share): add ShareDialog component"
```

---

## Phase 4 — Pages, Routing, and Integration

### Task 19: `app/(app)/collections/page.tsx` and `app/(app)/collections/[id]/page.tsx`

**Files:**

- Create: `app/(app)/collections/page.tsx`
- Create: `app/(app)/collections/[id]/page.tsx`
- Modify: `proxy.ts` (add `/collections` to `PROTECTED_PATHS`)

**Interfaces:**

- Consumes: `useCollections`, `useCollection`, `useDeleteCollection`, `useReorderCollectionItems`, `useRemoveCollectionItem`, `useUpdateCollectionItem` (Task 6); `CollectionCard`, `CollectionForm` (Task 12); `CollectionItemCard` (Task 13); `ShareDialog` (Task 18); `@dnd-kit/core` (Task 11).
- Produces: `/collections` route (grid + "New collection" dialog) and `/collections/[id]` route (detail, drag-reorder, edit/delete) — terminal UI surface for this task, nothing downstream consumes these pages directly.

- [ ] **Step 1: Add `/collections` to `proxy.ts`'s `PROTECTED_PATHS`**

Read `proxy.ts` first, then change:

```ts
const PROTECTED_PATHS = ["/profile", "/admin", "/collections", "/library"];
```

(`/library` is added here too since Task 21 introduces that route and both share the same auth gate — doing it once avoids a second near-identical edit later.)

- [ ] **Step 2: Implement `app/(app)/collections/page.tsx`**

```tsx
// app/(app)/collections/page.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCollections } from "@/hooks/useCollections";
import { CollectionCard } from "@/components/collections/collection-card";
import { CollectionForm } from "@/components/collections/collection-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function CollectionsPage() {
  const t = useTranslations("collections");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: collectionsPage, isPending } = useCollections();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button />}>{t("newCollection")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("form.createTitle")}</DialogTitle>
            </DialogHeader>
            <CollectionForm onSuccess={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isPending && <Skeleton className="h-40 w-full" />}
      {!isPending && collectionsPage?.items.length === 0 && (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
      {!isPending && collectionsPage && collectionsPage.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collectionsPage.items.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement `app/(app)/collections/[id]/page.tsx`**

Uses `@dnd-kit/core`'s `DndContext`/`closestCenter` for drag, with `CollectionItemCard`'s
move-up/down buttons kept as the accessible keyboard/screen-reader path (both act on
the same local `orderedItems` state, committed via `reorderCollectionItems` on drop or
button click). Optimistic reorder: update local state immediately, roll back to
server data on mutation error.

```tsx
// app/(app)/collections/[id]/page.tsx
"use client";

import * as React from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  useCollection,
  useDeleteCollection,
  useRemoveCollectionItem,
  useReorderCollectionItems,
  useUpdateCollectionItem,
} from "@/hooks/useCollections";
import { CollectionItemCard } from "@/components/collections/collection-item-card";
import { CollectionForm } from "@/components/collections/collection-form";
import { ShareDialog } from "@/components/share/share-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import type { CollectionItemResponse } from "@/lib/api/types";

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("collections.detail");
  const router = useRouter();
  const { data: collection, isPending, isError } = useCollection(id);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [orderedItems, setOrderedItems] = React.useState<CollectionItemResponse[]>([]);

  const removeItem = useRemoveCollectionItem(id);
  const updateItem = useUpdateCollectionItem(id);
  const reorderItems = useReorderCollectionItems(id);
  const deleteCollection = useDeleteCollection();

  React.useEffect(() => {
    if (collection) {
      setOrderedItems(collection.items.items);
    }
  }, [collection]);

  function commitOrder(next: CollectionItemResponse[]) {
    const previous = orderedItems;
    setOrderedItems(next);
    reorderItems.mutate(
      next.map((item) => item.id),
      { onError: () => setOrderedItems(previous) },
    );
  }

  function moveItem(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;
    const next = [...orderedItems];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    commitOrder(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
    const newIndex = orderedItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...orderedItems];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    commitOrder(next);
  }

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !collection) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          {collection.description && (
            <p className="text-muted-foreground">{collection.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <ShareDialog kind="collection" targetId={collection.id} />
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              {t("editButton")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit collection</DialogTitle>
              </DialogHeader>
              <CollectionForm collection={collection} onSuccess={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger render={<Button variant="destructive" size="sm" />}>
              {t("deleteButton")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
                <DialogDescription>{t("deleteConfirmDescription")}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={deleteCollection.isPending}
                  onClick={() =>
                    deleteCollection.mutate(collection.id, {
                      onSuccess: () => router.push("/collections"),
                    })
                  }
                >
                  {t("deleteButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("itemsTitle")}</h2>
        {orderedItems.length === 0 && <p className="text-muted-foreground">{t("emptyItems")}</p>}
        {orderedItems.length > 0 && (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-2">
              {orderedItems.map((item, index) => (
                <CollectionItemCard
                  key={item.id}
                  item={item}
                  isFirst={index === 0}
                  isLast={index === orderedItems.length - 1}
                  onMoveUp={() => moveItem(index, -1)}
                  onMoveDown={() => moveItem(index, 1)}
                  onRemove={() => removeItem.mutate(item.id)}
                />
              ))}
            </div>
          </DndContext>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Manually verify the build compiles**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed. (No automated test for pages themselves per this repo's existing convention — Block 2's `app/(app)/books/[id]/page.tsx` has no `.test.tsx` either; page-level coverage comes from the Playwright e2e in Task 22.)

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/collections/ proxy.ts
git commit -m "feat(collections): add collections list and detail pages with drag-to-reorder"
```

---

### Task 20: Wire reviews, "Add to collection", and "Add to library" into `app/(app)/books/[id]/page.tsx`

**Files:**

- Modify: `app/(app)/books/[id]/page.tsx`

**Interfaces:**

- Consumes: `ReviewList`, `ReviewForm` (Tasks 14–15); `AddToCollectionDialog` (Task 13); `ShareDialog` (Task 18); `useMe` (existing, Block 1); `useCreateStatus` (Task 8).
- Produces: updated book detail page, including a status-kind `Select` + "Add to library" button (the only entry point that creates a `BookStatusResponse` anywhere in this block's UI surface — Task 21's `/library` page only reads/updates/lends/returns existing statuses, it has no create affordance). Task 23's e2e depends on this button existing.

- [ ] **Step 1: Read the current file (already read during planning — reproduced here for the diff)**

Current imports include `ReviewList from "@/components/catalog/review-list"` — this
line must change since Task 14 deleted that file.

- [ ] **Step 2: Rewrite the page**

This step assumes `add-to-library-control.tsx` (defined in Step 3 below) already
exists — do Step 3 first if executing literally top-to-bottom, or write both files
together; either order produces the same result since `page.tsx` only imports from
it, it doesn't inline it.

```tsx
// app/(app)/books/[id]/page.tsx
"use client";

import * as React from "react";
import { use } from "react";
import { useTranslations } from "next-intl";
import { useBook, useBookReviews } from "@/hooks/useBooks";
import { useMe } from "@/hooks/useMe";
import { ReleaseCard } from "@/components/catalog/release-card";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewForm } from "@/components/reviews/review-form";
import { SuggestEditDialog } from "@/components/catalog/suggest-edit-dialog";
import { AddToCollectionDialog } from "@/components/collections/add-to-collection-dialog";
import { AddToLibraryControl } from "./add-to-library-control";
import { ShareDialog } from "@/components/share/share-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReviewResponse } from "@/lib/api/types";

export default function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("catalog.pages");
  const reviewsT = useTranslations("reviews");
  const { data: book, isPending, isError } = useBook(id);
  const { data: reviewsPage, isLoading: reviewsLoading } = useBookReviews(id);
  const { data: me } = useMe();
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [editingReview, setEditingReview] = React.useState<ReviewResponse | undefined>(undefined);

  if (isPending) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (isError || !book) {
    return <p className="text-muted-foreground">{t("bookNotFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">{book.title}</h1>
          <div className="flex gap-2">
            {me && <AddToLibraryControl bookId={book.id} />}
            {me && <AddToCollectionDialog bookId={book.id} />}
            <ShareDialog kind="book" targetId={book.id} />
          </div>
        </div>
        {book.description && <p className="text-muted-foreground">{book.description}</p>}
        {me && !me.is_admin && (
          <SuggestEditDialog
            kind="edit_book"
            targetId={book.id}
            fields={[
              { key: "title", labelKey: "titleLabel", initialValue: book.title },
              {
                key: "description",
                labelKey: "descriptionLabel",
                initialValue: book.description,
                multiline: true,
              },
            ]}
          />
        )}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("releasesTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {book.releases.map((release) => (
            <ReleaseCard key={release.id} release={release} />
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t("reviewsTitle")}</h2>
          {me && (
            <Dialog
              open={reviewDialogOpen}
              onOpenChange={(open) => {
                setReviewDialogOpen(open);
                if (!open) setEditingReview(undefined);
              }}
            >
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                {reviewsT("writeReview")}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingReview ? reviewsT("editReview") : reviewsT("writeReview")}
                  </DialogTitle>
                </DialogHeader>
                <ReviewForm
                  bookId={editingReview ? undefined : book.id}
                  review={editingReview}
                  onSuccess={() => {
                    setReviewDialogOpen(false);
                    setEditingReview(undefined);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
        <ReviewList
          reviews={reviewsPage?.items ?? []}
          isLoading={reviewsLoading}
          currentUserId={me?.id}
          onEdit={(review) => {
            setEditingReview(review);
            setReviewDialogOpen(true);
          }}
        />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Add a component test for the new `AddToLibraryControl`**

This inline component is new logic (not just wiring existing components), so it
gets its own test even though it lives inside the page file rather than
`components/`. Create `app/(app)/books/[id]/add-to-library-control.test.tsx` — extract
`AddToLibraryControl` into its own file first, `app/(app)/books/[id]/add-to-library-control.tsx`,
so it's importable and testable in isolation (page files can't be cleanly unit
tested per this repo's existing convention — see Block 2's `app/(app)/books/[id]/page.tsx`
having no `.test.tsx` of its own). Update the import in `page.tsx` accordingly.

```tsx
// app/(app)/books/[id]/add-to-library-control.tsx
"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateStatus } from "@/hooks/useStatuses";
import type { BookStatusKind } from "@/lib/api/types";

const LIBRARY_STATUS_KINDS: BookStatusKind[] = ["owned", "wishlist", "pre_order"];

export function AddToLibraryControl({ bookId }: { bookId: string }) {
  const t = useTranslations("statuses");
  const createStatus = useCreateStatus();

  return (
    <Select
      onValueChange={(value) =>
        createStatus.mutate({ book_id: bookId, status: value as BookStatusKind })
      }
    >
      <SelectTrigger aria-label={t("pageTitle")}>
        <SelectValue placeholder={t("pageTitle")} />
      </SelectTrigger>
      <SelectContent>
        {LIBRARY_STATUS_KINDS.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {t(`kind.${kind}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

```tsx
// app/(app)/books/[id]/add-to-library-control.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { AddToLibraryControl } from "./add-to-library-control";
import enMessages from "@/messages/en.json";

function renderControl() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AddToLibraryControl bookId="b1" />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("AddToLibraryControl", () => {
  it("creates a status when a kind is selected", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/me/statuses", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: "s1", status: "wishlist" }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Wishlist" }));
    await waitFor(() => expect(capturedBody).toMatchObject({ book_id: "b1", status: "wishlist" }));
  });
});
```

Run: `pnpm test add-to-library-control`
Expected: PASS (1 test)

- [ ] **Step 4: Verify the build and existing catalog e2e still pass**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed.

Run: `pnpm test` (full unit/component suite)
Expected: all PASS, including everything from Phases 1–3.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/books/[id]/page.tsx" "app/(app)/books/[id]/add-to-library-control.tsx" "app/(app)/books/[id]/add-to-library-control.test.tsx"
git commit -m "feat(reviews): wire review CRUD, add-to-collection, add-to-library, and share into book detail page"
```

---

### Task 21: `app/(app)/library/page.tsx`

**Files:**

- Create: `app/(app)/library/page.tsx`

**Interfaces:**

- Consumes: `useLibrary`, `useWishlist`, `useLentOut`, `useBorrowed`, `useUpdateStatus` (Task 8); `StatusListItem` (Task 16); `LendDialog`, `ReturnConfirmDialog` (Task 17); shadcn `Tabs`, `Select` (existing Block 0 primitives).
- Produces: `/library` route (terminal UI surface).

- [ ] **Step 1: Read `components/ui/tabs.tsx` to confirm the exact `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` prop API before use**

Run: `cat components/ui/tabs.tsx`

- [ ] **Step 2: Implement the page**

```tsx
// app/(app)/library/page.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  useBorrowed,
  useLentOut,
  useLibrary,
  useUpdateStatus,
  useWishlist,
} from "@/hooks/useStatuses";
import { StatusListItem } from "@/components/statuses/status-list-item";
import { LendDialog } from "@/components/statuses/lend-dialog";
import { ReturnConfirmDialog } from "@/components/statuses/return-confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookStatusKind, BookStatusResponse } from "@/lib/api/types";

const STATUS_KINDS: BookStatusKind[] = [
  "owned",
  "wishlist",
  "pre_order",
  "lent_out",
  "borrowed",
  "gifted_away",
  "sold",
  "lost",
];

function StatusTabPanel({ query }: { query: ReturnType<typeof useLibrary> }) {
  const t = useTranslations("statuses");
  const kindT = useTranslations("statuses.kind");
  const updateStatus = useUpdateStatus("");
  const [changingId, setChangingId] = React.useState<string | null>(null);
  const [lendingId, setLendingId] = React.useState<string | null>(null);
  const [returningId, setReturningId] = React.useState<string | null>(null);

  if (query.isPending) {
    return <Skeleton className="h-40 w-full" />;
  }
  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((status: BookStatusResponse) => (
        <React.Fragment key={status.id}>
          <StatusListItem
            status={status}
            onChangeStatus={() => setChangingId(status.id)}
            onLend={() => setLendingId(status.id)}
            onReturn={() => setReturningId(status.id)}
          />
          {changingId === status.id && (
            <Select
              value={status.status}
              onValueChange={(value) => {
                updateStatus.mutate(
                  { status: value as BookStatusKind },
                  { onSuccess: () => setChangingId(null) },
                );
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {kindT(kind)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {lendingId === status.id && (
            <LendDialog
              statusId={status.id}
              open={true}
              onOpenChange={(open) => !open && setLendingId(null)}
            />
          )}
          {returningId === status.id && (
            <ReturnConfirmDialog
              statusId={status.id}
              open={true}
              onOpenChange={(open) => !open && setReturningId(null)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  const t = useTranslations("statuses");
  const library = useLibrary();
  const wishlist = useWishlist();
  const lentOut = useLentOut();
  const borrowed = useBorrowed();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">{t("tabs.library")}</TabsTrigger>
          <TabsTrigger value="wishlist">{t("tabs.wishlist")}</TabsTrigger>
          <TabsTrigger value="lentOut">{t("tabs.lentOut")}</TabsTrigger>
          <TabsTrigger value="borrowed">{t("tabs.borrowed")}</TabsTrigger>
        </TabsList>
        <TabsContent value="library">
          <StatusTabPanel query={library} />
        </TabsContent>
        <TabsContent value="wishlist">
          <StatusTabPanel query={wishlist} />
        </TabsContent>
        <TabsContent value="lentOut">
          <StatusTabPanel query={lentOut} />
        </TabsContent>
        <TabsContent value="borrowed">
          <StatusTabPanel query={borrowed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

Note: `useUpdateStatus("")` at the top of `StatusTabPanel` is a placeholder id — the
real status id isn't known until a specific row's "Change status" is clicked. Since
`useUpdateStatus`'s mutation function closes over `statusId` at hook-call time (see
Task 8), and this page changes which row is "active" via `changingId` state rather
than remounting per-row, the cleanest fix consistent with the existing hook shape is
to call `useUpdateStatus(changingId ?? "")` instead, recreating the hook when
`changingId` changes. Update the implementation above accordingly:
replace `const updateStatus = useUpdateStatus("");` with
`const updateStatus = useUpdateStatus(changingId ?? "");` (declared after
`changingId`'s `useState`, so reorder that one line above the hook call).

- [ ] **Step 3: Verify the build compiles**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/library/page.tsx"
git commit -m "feat(statuses): add library page with tabs, lend/return actions"
```

---

### Task 22: Friend-shelf read-only view

**Files:**

- Create: `app/(app)/friends/[userId]/page.tsx`

**Interfaces:**

- Consumes: `useFriendCollections`, `useFriendLibrary` (Task 9); `CollectionCard` (Task 12); `StatusListItem` (Task 16, rendered with no-op handlers to disable actions).
- Produces: `/friends/[userId]` route (terminal UI surface). Per the spec, this coordinates with Block 5's friend-profile shell once it exists — for now it's a standalone route, not yet linked from anywhere in the nav (no friend list exists until Block 5).

- [ ] **Step 1: Implement the page**

```tsx
// app/(app)/friends/[userId]/page.tsx
"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useFriendCollections, useFriendLibrary } from "@/hooks/useFriendContent";
import { CollectionCard } from "@/components/collections/collection-card";
import { StatusListItem } from "@/components/statuses/status-list-item";
import { Skeleton } from "@/components/ui/skeleton";

export default function FriendShelfPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const t = useTranslations("collections");
  const statusesT = useTranslations("statuses");
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
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">{t("pageTitle")}</h2>
        {collectionsPending && <Skeleton className="h-40 w-full" />}
        {collectionsError && <p className="text-muted-foreground">Not available.</p>}
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
        {libraryError && <p className="text-muted-foreground">Not available.</p>}
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
    </div>
  );
}
```

Note: `StatusListItem` still renders its action buttons even with no-op handlers per
this task — the spec calls for "disabled/no-action mode" but `StatusListItem`'s
current props (Task 16) don't have a `readOnly` flag. Rather than adding one now
(the buttons doing nothing is harmless — a friend's shelf has no lend/return/change
affordance a stranger could meaningfully use anyway, since the mutations are scoped
to the acting user's own statuses server-side and would 403), leave as-is; flag this
as a Block 8 audit note if a cleaner `readOnly` prop is wanted later. Do not add
speculative props not needed by any current call site.

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/friends/"
git commit -m "feat(social): add read-only friend shelf page (collections + library)"
```

---

## Phase 5 — E2E

### Task 23: Playwright happy-path e2e

**Files:**

- Create: `e2e/collections-reviews.spec.ts`

**Interfaces:**

- Consumes: `test`/`expect` from `e2e/fixtures.ts` (existing); the full page surface built in Phase 4, including Task 20's `AddToLibraryControl` as the status-create entry point.

- [ ] **Step 1: Write the happy-path spec**

Follows the exact scenario named in the design spec and the original repo design
doc: create a collection, add a book to it, reorder items, leave a review on that
book, mark the book's status wishlist → owned, lend it to a friend, mark it
returned. Uses the same graceful-skip guard as `e2e/catalog-browse.spec.ts` since no
seed script exists — if there are no books in the catalog, the whole flow can't run.

```ts
// e2e/collections-reviews.spec.ts
import { test, expect } from "./fixtures";

// NOTE: like e2e/catalog-browse.spec.ts, this requires pre-seeded catalog data
// (at least one book) in whatever API the e2e run targets, plus a logged-in
// session (register/login flow reused from e2e/auth.spec.ts's pattern). Skips
// gracefully if no books are present.
test.describe("collections and reviews happy path", () => {
  test("create collection, add book, reorder, review, change status, lend, return", async ({
    page,
  }) => {
    // Register a fresh user (mirrors e2e/auth.spec.ts's approach — no shared fixture exists for this yet).
    const email = `e2e-${Date.now()}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Username").fill(`e2euser${Date.now()}`);
    await page.getByLabel("Display name").fill("E2E User");
    await page.getByLabel("Password").fill("SuperSecret123!");
    await page.getByRole("button", { name: /create account/i }).click();

    // Create a collection.
    await page.goto("/collections");
    await page.getByRole("button", { name: /new collection/i }).click();
    await page.getByLabel("Name").fill("E2E Favorites");
    await page.getByRole("button", { name: /create collection/i }).click();
    await expect(page.getByText("E2E Favorites")).toBeVisible();

    // Find a book to attach.
    await page.goto("/books");
    const firstBookLink = page.locator('a[href^="/books/"]').first();
    const bookCount = await page.locator('a[href^="/books/"]').count();
    test.skip(bookCount === 0, "No books present in the catalog — requires seeded data.");
    await firstBookLink.click();

    // Add to collection.
    await page.getByRole("button", { name: /add to collection/i }).click();
    await page.getByText("E2E Favorites").click();
    await expect(page.getByText(/added to e2e favorites/i)).toBeVisible();

    // Leave a review.
    await page.getByRole("button", { name: /write a review/i }).click();
    await page.getByRole("radio", { name: "5" }).click();
    await page.getByLabel(/review/i).fill("Excellent read for an e2e test.");
    await page.getByRole("button", { name: /post review/i }).click();
    await expect(page.getByText("Excellent read for an e2e test.")).toBeVisible();

    // Add to library as wishlist, using the AddToLibraryControl select on the
    // book detail page (added in Task 20 specifically to give this e2e a
    // concrete, reachable status-create entry point).
    await page.getByRole("combobox", { name: /my books/i }).click();
    await page.getByRole("option", { name: "Wishlist" }).click();

    // Move to the library page, change wishlist -> owned via "Change status".
    await page.goto("/library");
    await page.getByRole("tab", { name: /wishlist/i }).click();
    await page
      .getByRole("button", { name: /change status/i })
      .first()
      .click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Owned" }).click();
    await page.getByRole("tab", { name: /^library$/i }).click();
    await expect(page.getByText("Owned")).toBeVisible();

    // Lend it to a friend by free-text name, then mark it returned.
    await page
      .getByRole("button", { name: /lend to/i })
      .first()
      .click();
    await page.getByLabel(/or a name/i).fill("A Friend");
    await page.getByRole("button", { name: /^lend$/i }).click();
    await expect(page.getByText("A Friend")).toBeVisible();

    await page.getByRole("tab", { name: /lent out/i }).click();
    await page
      .getByRole("button", { name: /mark returned/i })
      .first()
      .click();
    await page
      .getByRole("button", { name: /mark returned/i })
      .last()
      .click();
  });
});
```

- [ ] **Step 2: Run the test locally against a live API**

Run: `pnpm exec playwright test e2e/collections-reviews.spec.ts`
Expected: passes if seed data exists, or gracefully skips per the `test.skip` guard on empty catalog. If any selector above doesn't match the actually-rendered markup (e.g. exact ARIA role/name shadcn's `Select`/`Tabs` produce via `@base-ui/react`), adjust the selector to match — the flow and intent are fixed by this plan, exact selector strings may need a small adjustment against the real DOM output.

- [ ] **Step 3: Commit**

```bash
git add e2e/collections-reviews.spec.ts
git commit -m "test(e2e): add collections/reviews/status happy-path Playwright spec"
```

---

## Final Verification

- [ ] **Run the full gate**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Expected: all pass. Fix any failures before opening the PR.

- [ ] **Open the PR**

Per `CLAUDE.md`: never push/merge directly to `main`. Push the feature branch and
open a PR via `gh pr create`.

```bash
git push -u origin block-3-collections-reviews
gh pr create --title "Block 3: Collections & Reviews" --body "..."
```
