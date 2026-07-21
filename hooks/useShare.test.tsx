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
      http.post("/api/share/collection/:id", () => HttpResponse.json({ id: "m1", thread_id: "t1" })),
    );
    const { result } = renderHook(() => useShareCollection(), { wrapper });
    result.current.mutate({ collectionId: "c1", payload: { friend_id: "f1", message: "hi" } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
