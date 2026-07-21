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
