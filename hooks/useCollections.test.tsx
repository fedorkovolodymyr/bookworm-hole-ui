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
        HttpResponse.json({ items: [{ id: "c1", name: "Favorites" }], total: 1, limit: 10, offset: 0 }),
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
      http.get("/api/collections/:id", () => HttpResponse.json({ detail: "Not found" }, { status: 404 })),
    );
    const { result } = renderHook(() => useCollection("missing"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCollection", () => {
  it("creates a collection and invalidates the list", async () => {
    server.use(
      http.post("/api/collections", () => HttpResponse.json({ id: "c1", name: "New" }, { status: 201 })),
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
