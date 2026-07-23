# Block 6 (AI & Chat) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the UI surface for the `ai` router (recommend/summary/tag-suggest — currently 501 stubs) and the `chat` router (friend-to-friend DM threads), per `docs/specs/2026-07-18-block-6-ai-chat-design.md`.

**Architecture:** Standard per-block shape used in Blocks 1-5: `lib/api/<domain>.ts` typed client → `hooks/use<Domain>.ts` TanStack Query hooks → `components/<domain>/` (Storybook + RTL covered) → `app/(app)/<domain>/...` pages → e2e happy path. Chat uses polling (`refetchInterval`) since no WebSocket/SSE exists on the API. `ai/*` 501s are rendered as a "coming soon" state, not routed through generic error toasts.

**Tech Stack:** Next.js App Router, TypeScript, TanStack Query, axios (`apiClient` from `lib/api/client.ts`), shadcn/ui primitives (`components/ui/`), next-intl (`messages/en.json` + `messages/uk.json`, kept in parity — enforced by `messages/messages.test.ts`), Vitest + RTL, Storybook, Playwright.

## Scope note: attachment chips deferred

The spec's UI Surface section describes an attachment chip (mini `BookCard`/`CollectionCard` preview) rendering inside a message bubble when `attachment_book_id`/`attachment_collection_id` is set. No message-composer UI in this plan sets those fields (`ChatComposer` only sends `body`), so no message produced by this UI will ever carry an attachment — the API fields exist and are typed (Task 1) and passed through unmodified by `sendMessage`/`getThreadMessages` (Task 2), but `MessageBubble` (Task 7) does not render a chip for them. This is a deliberate scope cut, not an oversight: wiring an attachment picker into the composer is a separate, non-trivial UI addition the spec doesn't fully design (no picker component named). Flag as a follow-up, not part of this block's happy path.

## Global Constraints

- All API calls go through the existing `apiClient` (`lib/api/client.ts`) — `baseURL: "/api"`, `withCredentials: true`. Do not create a new axios instance.
- Chat's `GET /chat/threads/` has a **trailing slash**; `POST /chat/threads` has **no trailing slash**. These are two distinct registered routes — get this wrong and one silently 404s/405s.
- `ai/recommend`, `ai/summary`, `ai/tag-suggest` currently return `501` by design (API not implemented yet). Treat `501` as a first-class UI state ("coming soon"), not an error toast.
- `startThread`'s `401 {"detail": "You can only message your friends"}` is a **business-rule rejection**, not a session-auth failure. It must not trigger `apiClient`'s global 401 refresh-and-redirect interceptor (`lib/api/client.ts:25-57`). See Task 2 for the exact mechanism.
- Every new UI string goes in **both** `messages/en.json` and `messages/uk.json` with matching key sets — `messages/messages.test.ts` fails the build otherwise. No empty string values.
- Component conventions: every `components/<domain>/*.tsx` gets a co-located `.stories.tsx` and `.test.tsx`, matching the pattern in `components/friends/`.
- Current user id comes from `useMe().data.id` (`UserProfileResponse.id`, `hooks/useMe.ts`). Friend display info (username/display_name/avatar_url) comes from `useFriends().data` (`FriendResponse[]`, keyed by `user_id`), per `hooks/useFriends.ts`.
- Route group is `app/(app)/` (authenticated shell) — same as existing `app/(app)/friends/`, `app/(app)/reading/`.
- Run `pnpm lint`, `pnpm exec tsc --noEmit` (or check `package.json` for an actual typecheck script name first), and `pnpm vitest run <path>` scoped to changed files before each commit. Run `pnpm format:check` before the final commit of the block (matches Block 5's `style: run prettier --write` cleanup commit pattern).

---

### Task 1: Chat & AI domain types

**Files:**
- Modify: `lib/api/types.ts` (append at end of file)

**Interfaces:**
- Produces: `ChatThreadResponse`, `ChatThreadWithLastMessageResponse`, `ChatMessageResponse`, `StartChatThreadPayload`, `SendChatMessagePayload`, `ListMessagesParams`, `RecommendRequest`, `RecommendResponse`, `SummaryRequest`, `SummaryResponse`, `TagSuggestRequest`, `TagSuggestResponse` — used by Tasks 2 and 3.

- [ ] **Step 1: Append the new types**

```typescript
// --- Chat domain types ---

export interface ChatThreadResponse {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string | null;
  created_at: string;
}

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

export interface ChatThreadWithLastMessageResponse extends ChatThreadResponse {
  last_message: ChatMessageResponse | null;
}

export interface StartChatThreadPayload {
  recipient_id: string;
}

export interface SendChatMessagePayload {
  body: string;
  attachment_book_id?: string;
  attachment_collection_id?: string;
}

export interface ListMessagesParams {
  before?: string;
  limit?: number;
}

// --- AI domain types ---

export interface RecommendRequest {
  user_id: string;
  n?: number;
}

export interface RecommendResponse {
  book_ids: string[];
}

export interface SummaryRequest {
  text: string;
}

export interface SummaryResponse {
  summary: string;
}

export interface TagSuggestRequest {
  book_id: string;
}

export interface TagSuggestResponse {
  tags: string[];
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from `lib/api/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/api/types.ts
git commit -m "feat(chat,ai): add chat and ai domain types"
```

---

### Task 2: Chat API client + business-rule-401 handling

**Files:**
- Create: `lib/api/chat.ts`
- Create: `lib/api/chat.test.ts`

**Interfaces:**
- Consumes: `apiClient` (`lib/api/client.ts`), `ChatThreadResponse`, `ChatThreadWithLastMessageResponse`, `ChatMessageResponse`, `StartChatThreadPayload`, `SendChatMessagePayload`, `ListMessagesParams` (Task 1).
- Produces: `startThread(recipientId: string): Promise<ChatThreadResponse>`, `listThreads(): Promise<ChatThreadWithLastMessageResponse[]>`, `getThreadMessages(threadId: string, params?: ListMessagesParams): Promise<ChatMessageResponse[]>`, `sendMessage(threadId: string, payload: SendChatMessagePayload): Promise<ChatMessageResponse>`, `markThreadRead(threadId: string): Promise<void>`, `ChatFriendRequiredError` (thrown by `startThread` on the business-rule 401) — used by Task 4 hooks.

**Why `startThread` doesn't need special interceptor plumbing:** `apiClient`'s response interceptor (`lib/api/client.ts:29-33`) only auto-retries a 401 when `!originalRequest._retry`. It always calls `apiClient(originalRequest)` again after a refresh attempt, or falls through to `Promise.reject(error)` on refresh failure — in both cases the rejected/resolved promise still reaches the original caller. The redirect-to-login side effect only fires if the *refresh call itself* fails with something other than "no refresh token" (`client.ts:47-52`). For a logged-in user hitting `startThread`'s business-rule 401, the refresh call will succeed (their session is valid), the original `/chat/threads` POST will be retried, and will 401 again — but `_retry` is now `true` so the interceptor does not loop; it rejects with the original 401 error. So no redirect happens, but there IS one wasted refresh round-trip per business-rule rejection. Catch the specific `detail` string in `startThread` and rethrow a typed error so callers don't need to inspect raw axios errors.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/api/chat.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import {
  startThread,
  listThreads,
  getThreadMessages,
  sendMessage,
  markThreadRead,
  ChatFriendRequiredError,
} from "./chat";

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("chat API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("startThread posts to /chat/threads (no trailing slash)", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: "t1", user_a_id: "u1", user_b_id: "u2", last_message_at: null, created_at: "x" },
    });
    const result = await startThread("u2");
    expect(apiClient.post).toHaveBeenCalledWith("/chat/threads", { recipient_id: "u2" });
    expect(result.id).toBe("t1");
  });

  it("startThread throws ChatFriendRequiredError on the business-rule 401", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { status: 401, data: { detail: "You can only message your friends" } },
    });
    await expect(startThread("stranger")).rejects.toBeInstanceOf(ChatFriendRequiredError);
  });

  it("startThread rethrows other errors unchanged", async () => {
    const other = { response: { status: 500, data: { detail: "boom" } } };
    vi.mocked(apiClient.post).mockRejectedValue(other);
    await expect(startThread("u2")).rejects.toBe(other);
  });

  it("listThreads gets /chat/threads/ (trailing slash)", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await listThreads();
    expect(apiClient.get).toHaveBeenCalledWith("/chat/threads/");
  });

  it("getThreadMessages passes before/limit as query params", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });
    await getThreadMessages("t1", { before: "m5", limit: 20 });
    expect(apiClient.get).toHaveBeenCalledWith("/chat/threads/t1/messages", {
      params: { before: "m5", limit: 20 },
    });
  });

  it("sendMessage posts the message body", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { id: "m1", thread_id: "t1", sender_id: "u1", body: "hi", attachment_book_id: null, attachment_collection_id: null, read_at: null, created_at: "x" },
    });
    await sendMessage("t1", { body: "hi" });
    expect(apiClient.post).toHaveBeenCalledWith("/chat/threads/t1/messages", { body: "hi" });
  });

  it("markThreadRead posts to the read endpoint", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });
    await markThreadRead("t1");
    expect(apiClient.post).toHaveBeenCalledWith("/chat/threads/t1/read");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/chat.test.ts`
Expected: FAIL — `Cannot find module './chat'`.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/api/chat.ts
import { apiClient } from "./client";
import { isAxiosError } from "./errors";
import type {
  ChatMessageResponse,
  ChatThreadResponse,
  ChatThreadWithLastMessageResponse,
  ListMessagesParams,
  SendChatMessagePayload,
} from "./types";

const FRIEND_REQUIRED_DETAIL = "You can only message your friends";

export class ChatFriendRequiredError extends Error {
  constructor() {
    super(FRIEND_REQUIRED_DETAIL);
    this.name = "ChatFriendRequiredError";
  }
}

export async function startThread(recipientId: string): Promise<ChatThreadResponse> {
  try {
    const { data } = await apiClient.post("/chat/threads", { recipient_id: recipientId });
    return data;
  } catch (error) {
    if (
      isAxiosError(error) &&
      error.response?.status === 401 &&
      (error.response?.data as { detail?: string } | undefined)?.detail === FRIEND_REQUIRED_DETAIL
    ) {
      throw new ChatFriendRequiredError();
    }
    throw error;
  }
}

export async function listThreads(): Promise<ChatThreadWithLastMessageResponse[]> {
  const { data } = await apiClient.get("/chat/threads/");
  return data;
}

export async function getThreadMessages(
  threadId: string,
  params?: ListMessagesParams,
): Promise<ChatMessageResponse[]> {
  const { data } = await apiClient.get(`/chat/threads/${threadId}/messages`, { params });
  return data;
}

export async function sendMessage(
  threadId: string,
  payload: SendChatMessagePayload,
): Promise<ChatMessageResponse> {
  const { data } = await apiClient.post(`/chat/threads/${threadId}/messages`, payload);
  return data;
}

export async function markThreadRead(threadId: string): Promise<void> {
  await apiClient.post(`/chat/threads/${threadId}/read`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/chat.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Lint**

Run: `pnpm lint lib/api/chat.ts lib/api/chat.test.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/api/chat.ts lib/api/chat.test.ts
git commit -m "feat(chat): add chat API client"
```

---

### Task 3: AI API client

**Files:**
- Create: `lib/api/ai.ts`
- Create: `lib/api/ai.test.ts`

**Interfaces:**
- Consumes: `apiClient`, `isAxiosError` (`lib/api/errors.ts`), `RecommendRequest`, `RecommendResponse`, `SummaryRequest`, `SummaryResponse`, `TagSuggestRequest`, `TagSuggestResponse` (Task 1).
- Produces: `recommendBooks(req: RecommendRequest): Promise<RecommendResponse>`, `generateSummary(req: SummaryRequest): Promise<SummaryResponse>`, `suggestTags(req: TagSuggestRequest): Promise<TagSuggestResponse>`, `AiFeatureUnavailableError` — used by Task 5 hooks.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/api/ai.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { apiClient } from "./client";
import { recommendBooks, generateSummary, suggestTags, AiFeatureUnavailableError } from "./ai";

vi.mock("./client", () => ({
  apiClient: { post: vi.fn() },
}));

describe("ai API client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recommendBooks posts to /ai/recommend and returns book_ids", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { book_ids: ["b1", "b2"] } });
    const result = await recommendBooks({ user_id: "u1", n: 5 });
    expect(apiClient.post).toHaveBeenCalledWith("/ai/recommend", { user_id: "u1", n: 5 });
    expect(result.book_ids).toEqual(["b1", "b2"]);
  });

  it("recommendBooks throws AiFeatureUnavailableError on 501", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({
      response: { status: 501, data: { detail: "AI recommendation feature is not implemented yet" } },
    });
    await expect(recommendBooks({ user_id: "u1" })).rejects.toBeInstanceOf(AiFeatureUnavailableError);
  });

  it("generateSummary posts to /ai/summary", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { summary: "short" } });
    const result = await generateSummary({ text: "long text" });
    expect(apiClient.post).toHaveBeenCalledWith("/ai/summary", { text: "long text" });
    expect(result.summary).toBe("short");
  });

  it("generateSummary throws AiFeatureUnavailableError on 501", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { status: 501, data: {} } });
    await expect(generateSummary({ text: "x" })).rejects.toBeInstanceOf(AiFeatureUnavailableError);
  });

  it("suggestTags posts to /ai/tag-suggest", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { tags: ["fantasy"] } });
    const result = await suggestTags({ book_id: "b1" });
    expect(apiClient.post).toHaveBeenCalledWith("/ai/tag-suggest", { book_id: "b1" });
    expect(result.tags).toEqual(["fantasy"]);
  });

  it("suggestTags throws AiFeatureUnavailableError on 501", async () => {
    vi.mocked(apiClient.post).mockRejectedValue({ response: { status: 501, data: {} } });
    await expect(suggestTags({ book_id: "b1" })).rejects.toBeInstanceOf(AiFeatureUnavailableError);
  });

  it("propagates non-501 errors unchanged", async () => {
    const other = { response: { status: 422, data: { detail: "bad input" } } };
    vi.mocked(apiClient.post).mockRejectedValue(other);
    await expect(generateSummary({ text: "" })).rejects.toBe(other);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/api/ai.test.ts`
Expected: FAIL — `Cannot find module './ai'`.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/api/ai.ts
import { apiClient } from "./client";
import { isAxiosError } from "./errors";
import type {
  RecommendRequest,
  RecommendResponse,
  SummaryRequest,
  SummaryResponse,
  TagSuggestRequest,
  TagSuggestResponse,
} from "./types";

export class AiFeatureUnavailableError extends Error {
  constructor(feature: string) {
    super(`${feature} is not implemented yet`);
    this.name = "AiFeatureUnavailableError";
  }
}

function rethrow501(error: unknown, feature: string): never {
  if (isAxiosError(error) && error.response?.status === 501) {
    throw new AiFeatureUnavailableError(feature);
  }
  throw error;
}

export async function recommendBooks(req: RecommendRequest): Promise<RecommendResponse> {
  try {
    const { data } = await apiClient.post("/ai/recommend", req);
    return data;
  } catch (error) {
    rethrow501(error, "recommend");
  }
}

export async function generateSummary(req: SummaryRequest): Promise<SummaryResponse> {
  try {
    const { data } = await apiClient.post("/ai/summary", req);
    return data;
  } catch (error) {
    rethrow501(error, "summary");
  }
}

export async function suggestTags(req: TagSuggestRequest): Promise<TagSuggestResponse> {
  try {
    const { data } = await apiClient.post("/ai/tag-suggest", req);
    return data;
  } catch (error) {
    rethrow501(error, "tag-suggest");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/api/ai.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Lint**

Run: `pnpm lint lib/api/ai.ts lib/api/ai.test.ts`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/api/ai.ts lib/api/ai.test.ts
git commit -m "feat(ai): add ai API client"
```

---

### Task 4: Chat TanStack Query hooks

**Files:**
- Create: `hooks/useChat.ts`
- Create: `hooks/useChat.test.tsx`

**Interfaces:**
- Consumes: `startThread`, `listThreads`, `getThreadMessages`, `sendMessage`, `markThreadRead`, `ChatFriendRequiredError` (Task 2); `ChatMessageResponse`, `SendChatMessagePayload` (Task 1).
- Produces: `useThreads()`, `useThreadMessages(threadId: string)`, `useStartThread()`, `useSendMessage(threadId: string)`, `useMarkThreadRead()` — used by Task 6/7/8 components and pages.

**Notes:**
- `useThreads()`: `useQuery({ queryKey: ["chat", "threads"], queryFn: listThreads, refetchInterval: 20000 })`.
- `useThreadMessages(threadId)`: `useInfiniteQuery` with `initialPageParam: undefined`, `getNextPageParam` reading the **oldest** message's `id` (API returns newest-first per the spec's "reverse-chronological" note — treat the last item in each returned page as oldest), `refetchInterval: 20000` only when there's no `before` cursor pagination in flight (keep simple: always poll page 1 by also invalidating `["chat", "threads", threadId, "messages"]` on the base query — simplest correct approach: just set `refetchInterval: 20000` on the infinite query, TanStack Query will refetch all currently-loaded pages).
- `useSendMessage(threadId)`: optimistic append using `queryClient.setQueryData` on the infinite query's first page, temp id via `crypto.randomUUID()`, replaced with server id in `onSuccess`, reverted in `onError`; `onSettled` invalidates `["chat", "threads"]`.
- `useStartThread()`: plain mutation, no cache write (caller navigates on success); let `ChatFriendRequiredError` propagate to the caller's `onError`.
- `useMarkThreadRead()`: mutation invalidating `["chat", "threads"]` and `["chat", "threads", threadId, "messages"]` — needs `threadId` passed as the mutation variable since it's called from multiple places.

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useChat.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as chatApi from "@/lib/api/chat";
import { useThreads, useThreadMessages, useStartThread, useSendMessage, useMarkThreadRead } from "./useChat";

vi.mock("@/lib/api/chat");

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useChat hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useThreads fetches the thread list", async () => {
    vi.mocked(chatApi.listThreads).mockResolvedValue([
      { id: "t1", user_a_id: "u1", user_b_id: "u2", last_message_at: null, created_at: "x", last_message: null },
    ]);
    const { result } = renderHook(() => useThreads(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("useThreadMessages fetches the first page", async () => {
    vi.mocked(chatApi.getThreadMessages).mockResolvedValue([
      { id: "m1", thread_id: "t1", sender_id: "u1", body: "hi", attachment_book_id: null, attachment_collection_id: null, read_at: null, created_at: "x" },
    ]);
    const { result } = renderHook(() => useThreadMessages("t1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.getThreadMessages).toHaveBeenCalledWith("t1", { before: undefined, limit: 50 });
    expect(result.current.data?.pages[0]).toHaveLength(1);
  });

  it("useStartThread calls startThread with recipientId", async () => {
    vi.mocked(chatApi.startThread).mockResolvedValue({
      id: "t1", user_a_id: "u1", user_b_id: "u2", last_message_at: null, created_at: "x",
    });
    const { result } = renderHook(() => useStartThread(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.startThread).toHaveBeenCalledWith("u2");
  });

  it("useSendMessage calls sendMessage with the thread id and payload", async () => {
    vi.mocked(chatApi.sendMessage).mockResolvedValue({
      id: "m2", thread_id: "t1", sender_id: "u1", body: "hey", attachment_book_id: null, attachment_collection_id: null, read_at: null, created_at: "x",
    });
    const { result } = renderHook(() => useSendMessage("t1"), { wrapper });
    result.current.mutate({ body: "hey" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.sendMessage).toHaveBeenCalledWith("t1", { body: "hey" });
  });

  it("useMarkThreadRead calls markThreadRead", async () => {
    vi.mocked(chatApi.markThreadRead).mockResolvedValue(undefined);
    const { result } = renderHook(() => useMarkThreadRead(), { wrapper });
    result.current.mutate("t1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(chatApi.markThreadRead).toHaveBeenCalledWith("t1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useChat.test.tsx`
Expected: FAIL — `Cannot find module './useChat'`.

- [ ] **Step 3: Write the implementation**

```typescript
// hooks/useChat.ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getThreadMessages,
  markThreadRead,
  sendMessage,
  startThread,
  listThreads,
} from "@/lib/api/chat";
import type { ChatMessageResponse, SendChatMessagePayload } from "@/lib/api/types";

const POLL_INTERVAL_MS = 20000;

export function useThreads() {
  return useQuery({
    queryKey: ["chat", "threads"],
    queryFn: listThreads,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useThreadMessages(threadId: string) {
  return useInfiniteQuery({
    queryKey: ["chat", "threads", threadId, "messages"],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getThreadMessages(threadId, { before: pageParam, limit: 50 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: ChatMessageResponse[]) =>
      lastPage.length > 0 ? lastPage[lastPage.length - 1].id : undefined,
    refetchInterval: POLL_INTERVAL_MS,
  });
}

export function useStartThread() {
  return useMutation({
    mutationFn: (recipientId: string) => startThread(recipientId),
  });
}

export function useSendMessage(threadId: string) {
  const queryClient = useQueryClient();
  const messagesKey = ["chat", "threads", threadId, "messages"];

  return useMutation({
    mutationFn: (payload: SendChatMessagePayload) => sendMessage(threadId, payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: messagesKey });
      const previous = queryClient.getQueryData(messagesKey);
      const tempId = crypto.randomUUID();
      const optimisticMessage: ChatMessageResponse = {
        id: tempId,
        thread_id: threadId,
        sender_id: "",
        body: payload.body,
        attachment_book_id: payload.attachment_book_id ?? null,
        attachment_collection_id: payload.attachment_collection_id ?? null,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      queryClient.setQueryData(
        messagesKey,
        (
          data:
            | { pages: ChatMessageResponse[][]; pageParams: (string | undefined)[] }
            | undefined,
        ) => {
          if (!data) return data;
          const [firstPage, ...rest] = data.pages;
          return { ...data, pages: [[optimisticMessage, ...firstPage], ...rest] };
        },
      );
      return { previous, tempId };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(messagesKey, context.previous);
      }
    },
    onSuccess: (message, _payload, context) => {
      queryClient.setQueryData(
        messagesKey,
        (
          data:
            | { pages: ChatMessageResponse[][]; pageParams: (string | undefined)[] }
            | undefined,
        ) => {
          if (!data) return data;
          const [firstPage, ...rest] = data.pages;
          return {
            ...data,
            pages: [
              firstPage.map((m) => (m.id === context?.tempId ? message : m)),
              ...rest,
            ],
          };
        },
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
    },
  });
}

export function useMarkThreadRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => markThreadRead(threadId),
    onSuccess: (_data, threadId) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "threads"] });
      queryClient.invalidateQueries({ queryKey: ["chat", "threads", threadId, "messages"] });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useChat.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Lint**

Run: `pnpm lint hooks/useChat.ts hooks/useChat.test.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/useChat.ts hooks/useChat.test.tsx
git commit -m "feat(chat): add useChat TanStack Query hooks"
```

---

### Task 5: AI TanStack Query hooks

**Files:**
- Create: `hooks/useAi.ts`
- Create: `hooks/useAi.test.tsx`

**Interfaces:**
- Consumes: `recommendBooks`, `generateSummary`, `suggestTags`, `AiFeatureUnavailableError` (Task 3).
- Produces: `useRecommendations()`, `useSummary()`, `useTagSuggestions()` — mutations, used by Task 9 components.

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useAi.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as aiApi from "@/lib/api/ai";
import { useRecommendations, useSummary, useTagSuggestions } from "./useAi";

vi.mock("@/lib/api/ai");

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useAi hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useRecommendations calls recommendBooks", async () => {
    vi.mocked(aiApi.recommendBooks).mockResolvedValue({ book_ids: ["b1"] });
    const { result } = renderHook(() => useRecommendations(), { wrapper });
    result.current.mutate({ user_id: "u1", n: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aiApi.recommendBooks).toHaveBeenCalledWith({ user_id: "u1", n: 5 });
  });

  it("useSummary surfaces AiFeatureUnavailableError", async () => {
    vi.mocked(aiApi.generateSummary).mockRejectedValue(new aiApi.AiFeatureUnavailableError("summary"));
    const { result } = renderHook(() => useSummary(), { wrapper });
    result.current.mutate({ text: "x" });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(aiApi.AiFeatureUnavailableError);
  });

  it("useTagSuggestions calls suggestTags", async () => {
    vi.mocked(aiApi.suggestTags).mockResolvedValue({ tags: ["scifi"] });
    const { result } = renderHook(() => useTagSuggestions(), { wrapper });
    result.current.mutate({ book_id: "b1" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(aiApi.suggestTags).toHaveBeenCalledWith({ book_id: "b1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run hooks/useAi.test.tsx`
Expected: FAIL — `Cannot find module './useAi'`.

- [ ] **Step 3: Write the implementation**

```typescript
// hooks/useAi.ts
import { useMutation } from "@tanstack/react-query";
import { generateSummary, recommendBooks, suggestTags } from "@/lib/api/ai";
import type { RecommendRequest, SummaryRequest, TagSuggestRequest } from "@/lib/api/types";

export function useRecommendations() {
  return useMutation({
    mutationFn: (req: RecommendRequest) => recommendBooks(req),
  });
}

export function useSummary() {
  return useMutation({
    mutationFn: (req: SummaryRequest) => generateSummary(req),
  });
}

export function useTagSuggestions() {
  return useMutation({
    mutationFn: (req: TagSuggestRequest) => suggestTags(req),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run hooks/useAi.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Lint**

Run: `pnpm lint hooks/useAi.ts hooks/useAi.test.tsx`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAi.ts hooks/useAi.test.tsx
git commit -m "feat(ai): add useAi TanStack Query hooks"
```

---

### Task 6: i18n strings for chat and ai domains

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/uk.json`

**Interfaces:**
- Produces: `chat.*` and `ai.*` translation keys — consumed by Tasks 7-10's components via `useTranslations("chat")` / `useTranslations("ai")`.

- [ ] **Step 1: Add the `chat` and `ai` top-level keys to `messages/en.json`**

Add as new top-level keys (alongside existing `"friends": { ... }`):

```json
"chat": {
  "pageTitle": "Chat",
  "threadList": {
    "empty": "No conversations yet.",
    "unread": "Unread"
  },
  "thread": {
    "placeholder": "Write a message...",
    "send": "Send",
    "sending": "Sending...",
    "loadEarlier": "Load earlier messages",
    "notFound": "This conversation is no longer available.",
    "backToThreads": "Back to conversations"
  },
  "messageButton": "Message",
  "friendRequiredError": "You can only message your friends."
},
"ai": {
  "pageTitle": "AI Tools",
  "comingSoon": "Coming soon",
  "recommendations": {
    "title": "Recommendations",
    "countLabel": "Number of recommendations",
    "submit": "Get recommendations",
    "submitting": "Getting recommendations...",
    "empty": "No recommendations yet."
  },
  "summary": {
    "title": "Summary",
    "inputLabel": "Text to summarize",
    "submit": "Summarize",
    "submitting": "Summarizing..."
  },
  "tagSuggest": {
    "title": "Tag suggestions",
    "bookLabel": "Book",
    "submit": "Suggest tags",
    "submitting": "Suggesting tags...",
    "empty": "No tags suggested yet."
  }
}
```

- [ ] **Step 2: Add the matching `chat` and `ai` keys to `messages/uk.json`**

Same key structure, Ukrainian values (translate each string above; keep placeholders/structure identical, no empty strings):

```json
"chat": {
  "pageTitle": "Чат",
  "threadList": {
    "empty": "Поки немає розмов.",
    "unread": "Непрочитано"
  },
  "thread": {
    "placeholder": "Напишіть повідомлення...",
    "send": "Надіслати",
    "sending": "Надсилання...",
    "loadEarlier": "Завантажити попередні повідомлення",
    "notFound": "Ця розмова більше недоступна.",
    "backToThreads": "Назад до розмов"
  },
  "messageButton": "Написати",
  "friendRequiredError": "Ви можете писати лише друзям."
},
"ai": {
  "pageTitle": "ШІ-інструменти",
  "comingSoon": "Незабаром",
  "recommendations": {
    "title": "Рекомендації",
    "countLabel": "Кількість рекомендацій",
    "submit": "Отримати рекомендації",
    "submitting": "Отримання рекомендацій...",
    "empty": "Поки немає рекомендацій."
  },
  "summary": {
    "title": "Короткий зміст",
    "inputLabel": "Текст для скорочення",
    "submit": "Скоротити",
    "submitting": "Скорочення...",
    "empty": ""
  },
  "tagSuggest": {
    "title": "Пропозиції тегів",
    "bookLabel": "Книга",
    "submit": "Запропонувати теги",
    "submitting": "Пропонування тегів...",
    "empty": "Поки немає запропонованих тегів."
  }
}
```

Note: drop the stray `"summary": { ..., "empty": "" }` key above — the `summary` panel has no empty-list state (it's a single text result, not a list), so do not add an `empty` key under `summary` in either file. Only `recommendations.empty` and `tagSuggest.empty` exist.

- [ ] **Step 3: Also add a `chat` nav key under `shell.nav`**

In both `messages/en.json` and `messages/uk.json`, find the existing `"nav": { "browse": ..., "collections": ..., "reading": ..., "friends": ... }` block under `"shell"` and add `"chat": "Chat"` (en) / `"chat": "Чат"` (uk) as a sibling key.

- [ ] **Step 4: Run the i18n parity test**

Run: `pnpm vitest run messages/messages.test.ts`
Expected: PASS — same key sets, no empty strings.

- [ ] **Step 5: Commit**

```bash
git add messages/en.json messages/uk.json
git commit -m "feat(chat,ai): add chat and ai i18n strings"
```

---

### Task 7: Chat components — ThreadListItem, MessageBubble, ChatComposer

**Files:**
- Create: `components/chat/thread-list-item.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/chat/message-bubble.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/chat/chat-composer.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**
- Consumes: `ChatThreadWithLastMessageResponse`, `ChatMessageResponse` (Task 1), `FriendResponse` (existing, `lib/api/types.ts:542`), `Avatar`/`AvatarFallback`/`AvatarImage` (`components/ui/avatar.tsx`), `Textarea` (`components/ui/textarea.tsx`), `Button` (`components/ui/button.tsx`).
- Produces: `ThreadListItem({ thread, friend, currentUserId, onClick }: { thread: ChatThreadWithLastMessageResponse; friend: FriendResponse | undefined; currentUserId: string; onClick: () => void })`, `MessageBubble({ message, isOwn }: { message: ChatMessageResponse; isOwn: boolean })`, `ChatComposer({ onSend, isSending }: { onSend: (body: string) => void; isSending: boolean })` — used by Task 8's pages.

- [ ] **Step 1: `components/chat/thread-list-item.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { ChatThreadWithLastMessageResponse, FriendResponse } from "@/lib/api/types";

export interface ThreadListItemProps {
  thread: ChatThreadWithLastMessageResponse;
  friend: FriendResponse | undefined;
  currentUserId: string;
  onClick: () => void;
}

export function ThreadListItem({ thread, friend, currentUserId, onClick }: ThreadListItemProps) {
  const t = useTranslations("chat.threadList");
  const isUnread =
    thread.last_message !== null &&
    thread.last_message.sender_id !== currentUserId &&
    thread.last_message.read_at === null;
  const displayName = friend?.display_name ?? thread.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent flex w-full items-center gap-3 rounded-md p-3 text-left"
    >
      <Avatar>
        {friend?.avatar_url && <AvatarImage src={friend.avatar_url} alt={displayName} />}
        <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{displayName}</p>
          {isUnread && (
            <span className="bg-primary size-2 shrink-0 rounded-full" aria-label={t("unread")} />
          )}
        </div>
        <p className="text-muted-foreground truncate text-sm">
          {thread.last_message?.body ?? t("empty")}
        </p>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: `components/chat/thread-list-item.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ThreadListItem } from "./thread-list-item";

const friend = { user_id: "u2", username: "bee", display_name: "Bee", avatar_url: null, since: "x" };
const thread = {
  id: "t1",
  user_a_id: "u1",
  user_b_id: "u2",
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "x",
  last_message: {
    id: "m1",
    thread_id: "t1",
    sender_id: "u2",
    body: "hello there",
    attachment_book_id: null,
    attachment_collection_id: null,
    read_at: null,
    created_at: "x",
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ThreadListItem", () => {
  it("renders friend name and last message preview", () => {
    renderWithIntl(
      <ThreadListItem thread={thread} friend={friend} currentUserId="u1" onClick={() => {}} />,
    );
    expect(screen.getByText("Bee")).toBeInTheDocument();
    expect(screen.getByText("hello there")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    renderWithIntl(
      <ThreadListItem thread={thread} friend={friend} currentUserId="u1" onClick={onClick} />,
    );
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalled();
  });

  it("shows unread indicator when last message is unread and not from me", () => {
    renderWithIntl(
      <ThreadListItem thread={thread} friend={friend} currentUserId="u1" onClick={() => {}} />,
    );
    expect(screen.getByLabelText("Unread")).toBeInTheDocument();
  });

  it("hides unread indicator when last message is from me", () => {
    const mine = { ...thread, last_message: { ...thread.last_message, sender_id: "u1" } };
    renderWithIntl(
      <ThreadListItem thread={mine} friend={friend} currentUserId="u1" onClick={() => {}} />,
    );
    expect(screen.queryByLabelText("Unread")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: `components/chat/thread-list-item.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ThreadListItem } from "./thread-list-item";

const friend = { user_id: "u2", username: "bee", display_name: "Bee", avatar_url: null, since: "x" };
const baseThread = {
  id: "t1",
  user_a_id: "u1",
  user_b_id: "u2",
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "x",
};

const meta: Meta<typeof ThreadListItem> = {
  title: "Chat/ThreadListItem",
  component: ThreadListItem,
  args: { currentUserId: "u1", onClick: () => {} },
};
export default meta;
type Story = StoryObj<typeof ThreadListItem>;

export const Unread: Story = {
  args: {
    friend,
    thread: {
      ...baseThread,
      last_message: {
        id: "m1",
        thread_id: "t1",
        sender_id: "u2",
        body: "Hey, how's the book?",
        attachment_book_id: null,
        attachment_collection_id: null,
        read_at: null,
        created_at: "x",
      },
    },
  },
};

export const Read: Story = {
  args: {
    friend,
    thread: {
      ...baseThread,
      last_message: {
        id: "m1",
        thread_id: "t1",
        sender_id: "u1",
        body: "Loved it!",
        attachment_book_id: null,
        attachment_collection_id: null,
        read_at: "2026-01-01T00:05:00Z",
        created_at: "x",
      },
    },
  },
};

export const Empty: Story = {
  args: { friend, thread: { ...baseThread, last_message: null } },
};
```

- [ ] **Step 4: `components/chat/message-bubble.tsx`**

```tsx
import { cn } from "@/lib/utils";
import type { ChatMessageResponse } from "@/lib/api/types";

export interface MessageBubbleProps {
  message: ChatMessageResponse;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
          isOwn ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        {message.body}
      </div>
    </div>
  );
}
```

Check `lib/utils.ts` exports a `cn` helper before writing this (used across the codebase's shadcn components); if the helper lives elsewhere, adjust the import path to match.

- [ ] **Step 5: `components/chat/message-bubble.test.tsx`**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./message-bubble";

const message = {
  id: "m1",
  thread_id: "t1",
  sender_id: "u1",
  body: "hello",
  attachment_book_id: null,
  attachment_collection_id: null,
  read_at: null,
  created_at: "x",
};

describe("MessageBubble", () => {
  it("renders the message body", () => {
    render(<MessageBubble message={message} isOwn={true} />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies own-message styling when isOwn is true", () => {
    render(<MessageBubble message={message} isOwn={true} />);
    expect(screen.getByText("hello")).toHaveClass("bg-primary");
  });

  it("applies other-message styling when isOwn is false", () => {
    render(<MessageBubble message={message} isOwn={false} />);
    expect(screen.getByText("hello")).toHaveClass("bg-muted");
  });
});
```

- [ ] **Step 6: `components/chat/message-bubble.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { MessageBubble } from "./message-bubble";

const message = {
  id: "m1",
  thread_id: "t1",
  sender_id: "u1",
  body: "Have you finished the last chapter yet?",
  attachment_book_id: null,
  attachment_collection_id: null,
  read_at: null,
  created_at: "x",
};

const meta: Meta<typeof MessageBubble> = {
  title: "Chat/MessageBubble",
  component: MessageBubble,
  args: { message },
};
export default meta;
type Story = StoryObj<typeof MessageBubble>;

export const Own: Story = { args: { isOwn: true } };
export const Other: Story = { args: { isOwn: false } };
```

- [ ] **Step 7: `components/chat/chat-composer.tsx`**

```tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface ChatComposerProps {
  onSend: (body: string) => void;
  isSending: boolean;
}

export function ChatComposer({ onSend, isSending }: ChatComposerProps) {
  const t = useTranslations("chat.thread");
  const [value, setValue] = React.useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={t("placeholder")}
        className="min-h-10 flex-1 resize-none"
        disabled={isSending}
      />
      <Button type="submit" disabled={isSending || !value.trim()}>
        {isSending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 8: `components/chat/chat-composer.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ChatComposer } from "./chat-composer";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ChatComposer", () => {
  it("calls onSend with the trimmed message and clears the input", async () => {
    const onSend = vi.fn();
    renderWithIntl(<ChatComposer onSend={onSend} isSending={false} />);
    const textarea = screen.getByPlaceholderText("Write a message...");
    await userEvent.type(textarea, "  hello  ");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).toHaveBeenCalledWith("hello");
    expect(textarea).toHaveValue("");
  });

  it("does not call onSend for a blank message", async () => {
    const onSend = vi.fn();
    renderWithIntl(<ChatComposer onSend={onSend} isSending={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the input and button while sending", () => {
    renderWithIntl(<ChatComposer onSend={() => {}} isSending={true} />);
    expect(screen.getByPlaceholderText("Write a message...")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
  });
});
```

- [ ] **Step 9: `components/chat/chat-composer.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ChatComposer } from "./chat-composer";

const meta: Meta<typeof ChatComposer> = {
  title: "Chat/ChatComposer",
  component: ChatComposer,
  args: { onSend: () => {}, isSending: false },
};
export default meta;
type Story = StoryObj<typeof ChatComposer>;

export const Default: Story = {};
export const Sending: Story = { args: { isSending: true } };
```

- [ ] **Step 10: Run the tests**

Run: `pnpm vitest run components/chat/`
Expected: PASS, all tests across the three files.

- [ ] **Step 11: Lint**

Run: `pnpm lint components/chat/`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add components/chat/
git commit -m "feat(chat): add ThreadListItem, MessageBubble, ChatComposer components"
```

---

### Task 8: Chat pages — thread list and thread view

**Files:**
- Create: `app/(app)/chat/page.tsx`, `app/(app)/chat/page.test.tsx`
- Create: `app/(app)/chat/[threadId]/page.tsx`, `app/(app)/chat/[threadId]/page.test.tsx`

**Interfaces:**
- Consumes: `useThreads`, `useThreadMessages`, `useSendMessage`, `useMarkThreadRead` (Task 4), `useFriends` (existing `hooks/useFriends.ts`), `useMe` (existing `hooks/useMe.ts`), `ThreadListItem`, `MessageBubble`, `ChatComposer` (Task 7), `Skeleton` (`components/ui/skeleton.tsx`).
- Produces: `ChatThreadsPage` (route `/chat`), `ChatThreadPage` (route `/chat/[threadId]`) — the `[threadId]` route is linked from Task 9's friend-profile "Message" button.

- [ ] **Step 1: `app/(app)/chat/page.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useThreads } from "@/hooks/useChat";
import { useFriends } from "@/hooks/useFriends";
import { useMe } from "@/hooks/useMe";
import { ThreadListItem } from "@/components/chat/thread-list-item";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatThreadsPage() {
  const t = useTranslations("chat");
  const router = useRouter();
  const { data: me } = useMe();
  const threads = useThreads();
  const friends = useFriends();

  function otherUserId(userAId: string, userBId: string, currentUserId: string) {
    return userAId === currentUserId ? userBId : userAId;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
      {threads.isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {threads.isSuccess && threads.data.length === 0 && (
        <p className="text-muted-foreground">{t("threadList.empty")}</p>
      )}
      {threads.isSuccess && me && (
        <div className="flex flex-col gap-1">
          {threads.data.map((thread) => {
            const friendId = otherUserId(thread.user_a_id, thread.user_b_id, me.id);
            const friend = friends.data?.find((f) => f.user_id === friendId);
            return (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                friend={friend}
                currentUserId={me.id}
                onClick={() => router.push(`/chat/${thread.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `app/(app)/chat/page.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as chatHooks from "@/hooks/useChat";
import * as friendsHooks from "@/hooks/useFriends";
import * as meHooks from "@/hooks/useMe";
import ChatThreadsPage from "./page";

vi.mock("@/hooks/useChat");
vi.mock("@/hooks/useFriends");
vi.mock("@/hooks/useMe");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ChatThreadsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meHooks.useMe).mockReturnValue({ data: { id: "u1" } } as never);
    vi.mocked(friendsHooks.useFriends).mockReturnValue({
      data: [{ user_id: "u2", username: "bee", display_name: "Bee", avatar_url: null, since: "x" }],
    } as never);
  });

  it("shows empty state when there are no threads", () => {
    vi.mocked(chatHooks.useThreads).mockReturnValue({
      isPending: false,
      isSuccess: true,
      data: [],
    } as never);
    renderWithIntl(<ChatThreadsPage />);
    expect(screen.getByText("No conversations yet.")).toBeInTheDocument();
  });

  it("renders a thread row resolved against friend data", () => {
    vi.mocked(chatHooks.useThreads).mockReturnValue({
      isPending: false,
      isSuccess: true,
      data: [
        {
          id: "t1",
          user_a_id: "u1",
          user_b_id: "u2",
          last_message_at: "x",
          created_at: "x",
          last_message: null,
        },
      ],
    } as never);
    renderWithIntl(<ChatThreadsPage />);
    expect(screen.getByText("Bee")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: `app/(app)/chat/[threadId]/page.tsx`**

```tsx
"use client";

import * as React from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useThreadMessages, useSendMessage, useMarkThreadRead } from "@/hooks/useChat";
import { useMe } from "@/hooks/useMe";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = use(params);
  const t = useTranslations("chat.thread");
  const router = useRouter();
  const { data: me } = useMe();

  const messages = useThreadMessages(threadId);
  const sendMessage = useSendMessage(threadId);
  const markRead = useMarkThreadRead();

  React.useEffect(() => {
    markRead.mutate(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  if (messages.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">{t("notFound")}</p>
        <Button variant="outline" onClick={() => router.push("/chat")}>
          {t("backToThreads")}
        </Button>
      </div>
    );
  }

  const allMessages = messages.data?.pages.flat() ?? [];
  const orderedOldestFirst = [...allMessages].reverse();

  return (
    <div className="flex h-full flex-col gap-4">
      {messages.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => messages.fetchNextPage()}
          disabled={messages.isFetchingNextPage}
        >
          {t("loadEarlier")}
        </Button>
      )}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {messages.isPending && <Skeleton className="h-40 w-full" />}
        {me &&
          orderedOldestFirst.map((message) => (
            <MessageBubble key={message.id} message={message} isOwn={message.sender_id === me.id} />
          ))}
      </div>
      <ChatComposer
        onSend={(body) => sendMessage.mutate({ body })}
        isSending={sendMessage.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 4: `app/(app)/chat/[threadId]/page.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as chatHooks from "@/hooks/useChat";
import * as meHooks from "@/hooks/useMe";
import ChatThreadPage from "./page";

vi.mock("@/hooks/useChat");
vi.mock("@/hooks/useMe");
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ChatThreadPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meHooks.useMe).mockReturnValue({ data: { id: "u1" } } as never);
    vi.mocked(chatHooks.useMarkThreadRead).mockReturnValue({ mutate: vi.fn() } as never);
    vi.mocked(chatHooks.useSendMessage).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it("renders messages oldest-first", () => {
    vi.mocked(chatHooks.useThreadMessages).mockReturnValue({
      isPending: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      data: {
        pages: [
          [
            { id: "m2", thread_id: "t1", sender_id: "u2", body: "second", attachment_book_id: null, attachment_collection_id: null, read_at: null, created_at: "x" },
            { id: "m1", thread_id: "t1", sender_id: "u1", body: "first", attachment_book_id: null, attachment_collection_id: null, read_at: null, created_at: "x" },
          ],
        ],
      },
    } as never);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <ChatThreadPage params={Promise.resolve({ threadId: "t1" })} />
      </NextIntlClientProvider>,
    );
    const bodies = screen.getAllByText(/first|second/);
    expect(bodies[0]).toHaveTextContent("first");
    expect(bodies[1]).toHaveTextContent("second");
  });

  it("shows the not-found state on error", () => {
    vi.mocked(chatHooks.useThreadMessages).mockReturnValue({
      isPending: false,
      isError: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      data: undefined,
    } as never);
    renderWithIntl(<ChatThreadPage params={Promise.resolve({ threadId: "t1" })} />);
    expect(screen.getByText("This conversation is no longer available.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run "app/(app)/chat/"`
Expected: PASS, all tests across both page test files.

- [ ] **Step 6: Lint**

Run: `pnpm lint "app/(app)/chat/"`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/chat/"
git commit -m "feat(chat): add chat thread list and thread view pages"
```

---

### Task 9: "Message" button on friend profile + header nav link

**Files:**
- Modify: `app/(app)/friends/[userId]/page.tsx`
- Modify: `app/(app)/friends/[userId]/page.test.tsx`
- Modify: `components/shell/header.tsx`
- Modify: `components/shell/header.test.tsx`

**Interfaces:**
- Consumes: `useStartThread` (Task 4), `ChatFriendRequiredError` (Task 2), `useThreads` (Task 4, for the header's unread badge).
- Produces: friend-profile page navigates to `/chat/[threadId]` on successful `startThread`; header shows a "Chat" nav link with an unread-count badge.

- [ ] **Step 1: Add the Message button to `app/(app)/friends/[userId]/page.tsx`**

In the existing action-buttons block (around the `Unfriend`/`Block` buttons, `app/(app)/friends/[userId]/page.tsx:58-65`), add a Message button that calls `useStartThread` and navigates on success, surfacing `ChatFriendRequiredError` as an inline alert. Import `useRouter` from `next/navigation`, `useStartThread` from `@/hooks/useChat`, `ChatFriendRequiredError` from `@/lib/api/chat`.

```tsx
// Additions to app/(app)/friends/[userId]/page.tsx

import { useRouter } from "next/navigation";
import { useStartThread } from "@/hooks/useChat";
import { ChatFriendRequiredError } from "@/lib/api/chat";

// Inside the component, alongside the existing unfriendOpen/blockOpen state:
const router = useRouter();
const chatT = useTranslations("chat");
const startThread = useStartThread();
const [messageError, setMessageError] = React.useState<string | null>(null);

function handleMessage() {
  setMessageError(null);
  startThread.mutate(userId, {
    onSuccess: (thread) => router.push(`/chat/${thread.id}`),
    onError: (error) => {
      if (error instanceof ChatFriendRequiredError) {
        setMessageError(chatT("friendRequiredError"));
      }
    },
  });
}
```

Add the button next to the existing `Unfriend`/`Block` buttons:

```tsx
<Button variant="outline" size="sm" onClick={handleMessage} disabled={startThread.isPending}>
  {chatT("messageButton")}
</Button>
```

And render `messageError` inline (e.g. `{messageError && <p className="text-destructive text-sm">{messageError}</p>}`) beneath the profile card.

- [ ] **Step 2: Extend `app/(app)/friends/[userId]/page.test.tsx`**

Add test cases (mock `@/hooks/useChat`'s `useStartThread`):

```tsx
// Additions to app/(app)/friends/[userId]/page.test.tsx
import * as chatHooks from "@/hooks/useChat";
import { ChatFriendRequiredError } from "@/lib/api/chat";
vi.mock("@/hooks/useChat");

// in beforeEach or per-test:
vi.mocked(chatHooks.useStartThread).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);

it("navigates to the new thread when Message succeeds", async () => {
  // Reuse this file's existing next/navigation mock (it already mocks useRouter for the
  // Unfriend/Block flows) and grab the same `push` spy it exposes — do not create a second mock.
  const mutate = vi.fn((_id, { onSuccess }) => onSuccess({ id: "t9" }));
  vi.mocked(chatHooks.useStartThread).mockReturnValue({ mutate, isPending: false } as never);
  renderWithProviders(<FriendShelfPage params={Promise.resolve({ userId: "u2" })} />);
  await userEvent.click(screen.getByRole("button", { name: "Message" }));
  expect(mockRouterPush).toHaveBeenCalledWith("/chat/t9"); // use this file's actual push-spy name
});

it("shows an inline error when Message is rejected as not-a-friend", async () => {
  const mutate = vi.fn((_id, { onError }) => onError(new ChatFriendRequiredError()));
  vi.mocked(chatHooks.useStartThread).mockReturnValue({ mutate, isPending: false } as never);
  renderWithProviders(<FriendShelfPage params={Promise.resolve({ userId: "u2" })} />);
  await userEvent.click(screen.getByRole("button", { name: "Message" }));
  expect(await screen.findByText("You can only message your friends.")).toBeInTheDocument();
});
```

Read the existing test file first and match its actual mock/render helper names (`renderWithProviders`, how `next/navigation` is mocked, how `userEvent` is imported) — the snippet above shows intent, adapt names to match the file's real conventions exactly.

- [ ] **Step 3: Add the Chat nav link + unread badge to `components/shell/header.tsx`**

```tsx
// Additions to components/shell/header.tsx
import { useThreads } from "@/hooks/useChat";

// Inside Header():
const threads = useThreads();
const unreadCount =
  me && threads.data
    ? threads.data.filter(
        (t) => t.last_message && t.last_message.sender_id !== me.id && t.last_message.read_at === null,
      ).length
    : 0;
```

Add a nav link after the existing `friends` link (`components/shell/header.tsx:39-41`):

```tsx
<Link href="/chat" className="text-muted-foreground hover:text-foreground text-sm">
  {tShell("nav.chat")}
  {unreadCount > 0 && (
    <span className="bg-primary text-primary-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs">
      {unreadCount}
    </span>
  )}
</Link>
```

Only call `useThreads()` when `me` is set (guest users shouldn't poll an authenticated endpoint) — gate with `enabled: !!me` inside `useThreads` by adding an optional param, OR simplest fix matching existing hook signatures: keep `useThreads()` unconditional but rely on it 401ing harmlessly for guests since `apiClient` already handles unauthenticated 401s via the existing interceptor (check how `useFriends()` is already called unconditionally in other guest-visible shell code before deciding — if no such precedent exists, add an `enabled` option to `useThreads` in `hooks/useChat.ts` from Task 4 and gate on `!!me` here).

- [ ] **Step 4: Extend `components/shell/header.test.tsx`**

Add a test asserting the Chat link renders and the unread badge shows the correct count when `useThreads` mock data has an unread thread — mock `@/hooks/useChat`'s `useThreads` alongside the file's existing `useMe`/`useLogout` mocks, following that file's existing mocking pattern exactly.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run "app/(app)/friends/[userId]/page.test.tsx" components/shell/header.test.tsx`
Expected: PASS.

- [ ] **Step 6: Lint**

Run: `pnpm lint "app/(app)/friends/[userId]/page.tsx" components/shell/header.tsx`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/friends/[userId]/page.tsx" "app/(app)/friends/[userId]/page.test.tsx" components/shell/header.tsx components/shell/header.test.tsx
git commit -m "feat(chat): add Message button on friend profile and Chat nav link"
```

---

### Task 10: AI panel components — RecommendationsPanel, SummaryPanel, TagSuggestPanel

**Files:**
- Create: `components/ai/recommendations-panel.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/ai/summary-panel.tsx`, `.stories.tsx`, `.test.tsx`
- Create: `components/ai/tag-suggest-panel.tsx`, `.stories.tsx`, `.test.tsx`

**Interfaces:**
- Consumes: `useRecommendations`, `useSummary`, `useTagSuggestions` (Task 5), `AiFeatureUnavailableError` (Task 3), `Card`/`CardContent`/`CardHeader`/`CardTitle` (`components/ui/card.tsx`), `Button`, `Textarea`, `Badge` (`components/ui/badge.tsx`).
- Produces: `RecommendationsPanel()`, `SummaryPanel()`, `TagSuggestPanel({ bookId, bookLabel }: { bookId: string; bookLabel: string })` — used by Task 11's AI page. `TagSuggestPanel` takes a pre-selected book (id + label) as props rather than embedding Block 2's book-search component, since the spec's "book picker" isn't a well-defined shared component yet — keep this panel's book selection out of scope and accept it as a prop; the page (Task 11) is responsible for letting the user pick a book via a simple text input of a book id for now (documented as a known simplification, not silently dropped).

- [ ] **Step 1: `components/ai/recommendations-panel.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useRecommendations } from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { useMe } from "@/hooks/useMe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RecommendationsPanel() {
  const t = useTranslations("ai.recommendations");
  const tAi = useTranslations("ai");
  const { data: me } = useMe();
  const recommend = useRecommendations();

  const isUnavailable = recommend.error instanceof AiFeatureUnavailableError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          onClick={() => me && recommend.mutate({ user_id: me.id, n: 10 })}
          disabled={!me || recommend.isPending || isUnavailable}
        >
          {recommend.isPending ? t("submitting") : t("submit")}
        </Button>
        {isUnavailable && <p className="text-muted-foreground text-sm">{tAi("comingSoon")}</p>}
        {recommend.isSuccess && recommend.data.book_ids.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {recommend.isSuccess && recommend.data.book_ids.length > 0 && (
          <ul className="flex flex-col gap-1">
            {recommend.data.book_ids.map((id) => (
              <li key={id} className="text-sm">
                {id}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: `components/ai/recommendations-panel.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as aiHooks from "@/hooks/useAi";
import * as meHooks from "@/hooks/useMe";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { RecommendationsPanel } from "./recommendations-panel";

vi.mock("@/hooks/useAi");
vi.mock("@/hooks/useMe");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("RecommendationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meHooks.useMe).mockReturnValue({ data: { id: "u1" } } as never);
  });

  it("shows coming-soon state on AiFeatureUnavailableError", () => {
    vi.mocked(aiHooks.useRecommendations).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: new AiFeatureUnavailableError("recommend"),
    } as never);
    renderWithIntl(<RecommendationsPanel />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("calls recommend with the current user's id on submit", async () => {
    const mutate = vi.fn();
    vi.mocked(aiHooks.useRecommendations).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<RecommendationsPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Get recommendations" }));
    expect(mutate).toHaveBeenCalledWith({ user_id: "u1", n: 10 });
  });

  it("renders returned book ids", () => {
    vi.mocked(aiHooks.useRecommendations).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: { book_ids: ["b1", "b2"] },
      error: null,
    } as never);
    renderWithIntl(<RecommendationsPanel />);
    expect(screen.getByText("b1")).toBeInTheDocument();
    expect(screen.getByText("b2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: `components/ai/recommendations-panel.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { RecommendationsPanel } from "./recommendations-panel";

const meta: Meta<typeof RecommendationsPanel> = {
  title: "AI/RecommendationsPanel",
  component: RecommendationsPanel,
};
export default meta;
type Story = StoryObj<typeof RecommendationsPanel>;

export const Default: Story = {};
```

- [ ] **Step 4: `components/ai/summary-panel.tsx`**

```tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSummary } from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function SummaryPanel() {
  const t = useTranslations("ai.summary");
  const tAi = useTranslations("ai");
  const [text, setText] = React.useState("");
  const summary = useSummary();

  const isUnavailable = summary.error instanceof AiFeatureUnavailableError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("inputLabel")}
        />
        <Button
          onClick={() => summary.mutate({ text })}
          disabled={!text.trim() || summary.isPending || isUnavailable}
        >
          {summary.isPending ? t("submitting") : t("submit")}
        </Button>
        {isUnavailable && <p className="text-muted-foreground text-sm">{tAi("comingSoon")}</p>}
        {summary.isSuccess && <p className="text-sm">{summary.data.summary}</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: `components/ai/summary-panel.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as aiHooks from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { SummaryPanel } from "./summary-panel";

vi.mock("@/hooks/useAi");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SummaryPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables submit until text is entered", () => {
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<SummaryPanel />);
    expect(screen.getByRole("button", { name: "Summarize" })).toBeDisabled();
  });

  it("calls summary mutation with entered text", async () => {
    const mutate = vi.fn();
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<SummaryPanel />);
    await userEvent.type(screen.getByPlaceholderText("Text to summarize"), "some text");
    await userEvent.click(screen.getByRole("button", { name: "Summarize" }));
    expect(mutate).toHaveBeenCalledWith({ text: "some text" });
  });

  it("shows coming-soon state on AiFeatureUnavailableError", () => {
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: new AiFeatureUnavailableError("summary"),
    } as never);
    renderWithIntl(<SummaryPanel />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("renders the returned summary", () => {
    vi.mocked(aiHooks.useSummary).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: { summary: "a short summary" },
      error: null,
    } as never);
    renderWithIntl(<SummaryPanel />);
    expect(screen.getByText("a short summary")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: `components/ai/summary-panel.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { SummaryPanel } from "./summary-panel";

const meta: Meta<typeof SummaryPanel> = {
  title: "AI/SummaryPanel",
  component: SummaryPanel,
};
export default meta;
type Story = StoryObj<typeof SummaryPanel>;

export const Default: Story = {};
```

- [ ] **Step 7: `components/ai/tag-suggest-panel.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { useTagSuggestions } from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface TagSuggestPanelProps {
  bookId: string | null;
  bookLabel: string | null;
}

export function TagSuggestPanel({ bookId, bookLabel }: TagSuggestPanelProps) {
  const t = useTranslations("ai.tagSuggest");
  const tAi = useTranslations("ai");
  const tagSuggest = useTagSuggestions();

  const isUnavailable = tagSuggest.error instanceof AiFeatureUnavailableError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">{bookLabel ?? t("bookLabel")}</p>
        <Button
          onClick={() => bookId && tagSuggest.mutate({ book_id: bookId })}
          disabled={!bookId || tagSuggest.isPending || isUnavailable}
        >
          {tagSuggest.isPending ? t("submitting") : t("submit")}
        </Button>
        {isUnavailable && <p className="text-muted-foreground text-sm">{tAi("comingSoon")}</p>}
        {tagSuggest.isSuccess && tagSuggest.data.tags.length === 0 && (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        )}
        {tagSuggest.isSuccess && tagSuggest.data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tagSuggest.data.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8: `components/ai/tag-suggest-panel.test.tsx`**

```tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import * as aiHooks from "@/hooks/useAi";
import { AiFeatureUnavailableError } from "@/lib/api/ai";
import { TagSuggestPanel } from "./tag-suggest-panel";

vi.mock("@/hooks/useAi");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("TagSuggestPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables submit when no book is selected", () => {
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<TagSuggestPanel bookId={null} bookLabel={null} />);
    expect(screen.getByRole("button", { name: "Suggest tags" })).toBeDisabled();
  });

  it("calls the mutation with the selected book id", async () => {
    const mutate = vi.fn();
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate,
      isPending: false,
      isSuccess: false,
      error: null,
    } as never);
    renderWithIntl(<TagSuggestPanel bookId="b1" bookLabel="Dune" />);
    await userEvent.click(screen.getByRole("button", { name: "Suggest tags" }));
    expect(mutate).toHaveBeenCalledWith({ book_id: "b1" });
  });

  it("shows coming-soon state on AiFeatureUnavailableError", () => {
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      error: new AiFeatureUnavailableError("tag-suggest"),
    } as never);
    renderWithIntl(<TagSuggestPanel bookId="b1" bookLabel="Dune" />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("renders returned tags as badges", () => {
    vi.mocked(aiHooks.useTagSuggestions).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
      data: { tags: ["scifi", "classic"] },
      error: null,
    } as never);
    renderWithIntl(<TagSuggestPanel bookId="b1" bookLabel="Dune" />);
    expect(screen.getByText("scifi")).toBeInTheDocument();
    expect(screen.getByText("classic")).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: `components/ai/tag-suggest-panel.stories.tsx`**

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { TagSuggestPanel } from "./tag-suggest-panel";

const meta: Meta<typeof TagSuggestPanel> = {
  title: "AI/TagSuggestPanel",
  component: TagSuggestPanel,
  args: { bookId: "b1", bookLabel: "Dune" },
};
export default meta;
type Story = StoryObj<typeof TagSuggestPanel>;

export const Default: Story = {};
export const NoBookSelected: Story = { args: { bookId: null, bookLabel: null } };
```

- [ ] **Step 10: Run the tests**

Run: `pnpm vitest run components/ai/`
Expected: PASS, all tests across the three files.

- [ ] **Step 11: Lint**

Run: `pnpm lint components/ai/`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add components/ai/
git commit -m "feat(ai): add RecommendationsPanel, SummaryPanel, TagSuggestPanel components"
```

---

### Task 11: AI page

**Files:**
- Create: `app/(app)/ai/page.tsx`
- Create: `app/(app)/ai/page.test.tsx`

**Interfaces:**
- Consumes: `RecommendationsPanel`, `SummaryPanel`, `TagSuggestPanel` (Task 10), `Input` (`components/ui/input.tsx`).

- [ ] **Step 1: `app/(app)/ai/page.tsx`**

```tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { RecommendationsPanel } from "@/components/ai/recommendations-panel";
import { SummaryPanel } from "@/components/ai/summary-panel";
import { TagSuggestPanel } from "@/components/ai/tag-suggest-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AiPage() {
  const t = useTranslations("ai");
  const [bookId, setBookId] = React.useState("");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
      <RecommendationsPanel />
      <SummaryPanel />
      <div className="flex flex-col gap-2">
        <Label htmlFor="tag-suggest-book-id">{t("tagSuggest.bookLabel")}</Label>
        <Input
          id="tag-suggest-book-id"
          value={bookId}
          onChange={(event) => setBookId(event.target.value)}
        />
      </div>
      <TagSuggestPanel bookId={bookId.trim() || null} bookLabel={bookId.trim() || null} />
    </div>
  );
}
```

Check whether `components/ui/label.tsx` exists (shadcn/ui base kit) before using `Label` — if it doesn't exist in this repo yet, use a plain `<label htmlFor="tag-suggest-book-id" className="text-sm font-medium">` instead; do not add a new base component as a side effect of this task.

- [ ] **Step 2: `app/(app)/ai/page.test.tsx`**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import AiPage from "./page";

vi.mock("@/hooks/useAi", () => ({
  useRecommendations: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
  useSummary: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
  useTagSuggestions: () => ({ mutate: vi.fn(), isPending: false, isSuccess: false, error: null }),
}));
vi.mock("@/hooks/useMe", () => ({ useMe: () => ({ data: { id: "u1" } }) }));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={en}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("AiPage", () => {
  it("renders all three panels", () => {
    renderWithProviders(<AiPage />);
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Tag suggestions")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `pnpm vitest run "app/(app)/ai/"`
Expected: PASS.

- [ ] **Step 4: Lint**

Run: `pnpm lint "app/(app)/ai/"`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/ai/"
git commit -m "feat(ai): add AI tools page"
```

---

### Task 12: Playwright e2e — chat happy path + AI coming-soon check

**Files:**
- Create or extend: `e2e/chat.spec.ts` (check the actual e2e directory name/location by looking at Block 5's e2e test file location first — `git log --follow` or `find . -name '*.spec.ts' -not -path '*/node_modules/*'` — match its exact structure/helpers rather than assuming)

**Interfaces:**
- Consumes: whatever Playwright test setup/helpers Block 5's e2e test (`test(friends): add e2e happy-path test for friend request flow`, commit `82261e8`) already established (fixtures for registering/logging in two users, base URL config, etc.) — read that file in full before writing this one so conventions match exactly.

- [ ] **Step 1: Read Block 5's e2e test for conventions**

Run: `find . -path ./node_modules -prune -o -name "*.spec.ts" -print` then read the friends e2e spec fully to learn: how test users are created/logged in, how the Playwright config's `baseURL`/`webServer` is set up, whether it runs against a live local API or a mocked one.

- [ ] **Step 2: Write the chat happy-path e2e test**

Following the exact pattern found in Step 1: register two users, make them friends (reuse Block 5's friend-request flow — send request as user A, accept as user B), user A opens the friend's profile and clicks "Message", sends a message, switches auth context to user B (new browser context, matching however Block 5's spec handles a second user), opens `/chat`, sees the thread with the message, opens it, sees the message rendered, confirms `read_at` gets set (per the spec's live-tested note that `GET .../messages` auto-marks messages read — assert by re-fetching or checking no unread badge remains).

Write the actual Playwright test code once Step 1's conventions are known — do not guess the helper API in advance.

- [ ] **Step 3: Write the AI coming-soon check**

Log in as one user, navigate to `/ai`, assert each of the three panels renders its "Coming soon" text after attempting the relevant action (matches the spec's live-tested `501` behavior — no success path exists yet to test).

- [ ] **Step 4: Run the e2e tests**

Run: whatever command Block 5's e2e test used (check `package.json` for a `test:e2e` or similar script) against a running dev server + live local API, per this repo's existing e2e setup.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add e2e/
git commit -m "test(chat): add e2e happy-path test for chat flow and ai coming-soon states"
```

---

### Task 13: Final format pass

**Files:** whatever Block 5's `style: run prettier --write across Block 5 files` commit (`54a4d70`) touched, applied to this block's changed files.

- [ ] **Step 1: Run prettier**

Run: `pnpm format:check` (or `pnpm exec prettier --write <changed files>` if `format:check` only checks) — check `package.json` scripts first for the exact command name used in Block 5's equivalent commit.

- [ ] **Step 2: Run the full gate**

Run in order: `pnpm lint`, typecheck command (check `package.json`/`tsconfig.json` — likely `pnpm exec tsc --noEmit` since no dedicated script was confirmed to exist), `pnpm vitest run`, `pnpm build`.
Expected: all pass with zero errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "style: run prettier --write across Block 6 files to satisfy format:check"
```

---

## Post-plan: PR

Per `CLAUDE.md`'s git workflow, do not merge/push directly to `main`. Push `worktree-block-6-chat` and open a PR with `gh pr create`, following the same title/description pattern as PR #18 ("Block 5: Social (Friends)").
