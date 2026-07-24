// hooks/useCollectionReorder.test.tsx
import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useCollectionReorder } from "./useCollectionReorder";
import type { CollectionItemResponse } from "@/lib/api/types";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function makeItem(id: string, position: number): CollectionItemResponse {
  return {
    id,
    collection_id: "c1",
    book_id: `b-${id}`,
    release_id: null,
    position,
    added_at: "2020-01-01T00:00:00Z",
    note: null,
  };
}

const items = [makeItem("i1", 0), makeItem("i2", 1), makeItem("i3", 2)];

describe("useCollectionReorder", () => {
  it("syncs orderedItems from the server-provided items", () => {
    const { result, rerender } = renderHook(
      ({ serverItems }: { serverItems: CollectionItemResponse[] | undefined }) =>
        useCollectionReorder("c1", serverItems),
      {
        wrapper,
        initialProps: { serverItems: undefined as CollectionItemResponse[] | undefined },
      },
    );
    expect(result.current.orderedItems).toEqual([]);

    rerender({ serverItems: items });
    expect(result.current.orderedItems).toEqual(items);
  });

  it("does not clobber local order on identical re-renders", () => {
    const { result, rerender } = renderHook(
      ({ serverItems }: { serverItems: CollectionItemResponse[] | undefined }) =>
        useCollectionReorder("c1", serverItems),
      { wrapper, initialProps: { serverItems: items } },
    );

    server.use(
      http.post("/api/collections/:id/reorder", () => new HttpResponse(null, { status: 204 })),
    );

    act(() => {
      result.current.moveItem(0, 1);
    });
    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i2", "i1", "i3"]);

    // Re-rendering with the *same* server array reference must not reset
    // the optimistic local order.
    rerender({ serverItems: items });
    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i2", "i1", "i3"]);
  });

  it("moveItem swaps adjacent items and commits the mutation", async () => {
    let requestedIds: string[] | undefined;
    server.use(
      http.post("/api/collections/:id/reorder", async ({ request }) => {
        const body = (await request.json()) as { item_ids: string[] } | string[];
        requestedIds = Array.isArray(body) ? body : body.item_ids;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const { result } = renderHook(() => useCollectionReorder("c1", items), { wrapper });

    act(() => {
      result.current.moveItem(1, -1);
    });

    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i2", "i1", "i3"]);
    await waitFor(() => expect(requestedIds).toEqual(["i2", "i1", "i3"]));
  });

  it("moveItem is a no-op out of bounds", () => {
    const { result } = renderHook(() => useCollectionReorder("c1", items), { wrapper });
    act(() => {
      result.current.moveItem(0, -1);
    });
    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);

    act(() => {
      result.current.moveItem(items.length - 1, 1);
    });
    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);
  });

  it("rolls back optimistic order when the mutation fails", async () => {
    server.use(
      http.post("/api/collections/:id/reorder", () =>
        HttpResponse.json({ detail: "boom" }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useCollectionReorder("c1", items), { wrapper });

    act(() => {
      result.current.moveItem(0, 1);
    });
    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i2", "i1", "i3"]);

    await waitFor(() =>
      expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i1", "i2", "i3"]),
    );
  });

  it("handleDragEnd reorders based on active/over ids", async () => {
    server.use(
      http.post("/api/collections/:id/reorder", () => new HttpResponse(null, { status: 204 })),
    );
    const { result } = renderHook(() => useCollectionReorder("c1", items), { wrapper });

    act(() => {
      result.current.handleDragEnd({
        active: { id: "i1" },
        over: { id: "i3" },
      } as never);
    });

    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i2", "i3", "i1"]);
  });

  it("handleDragEnd is a no-op when dropped outside a target or on itself", () => {
    const { result } = renderHook(() => useCollectionReorder("c1", items), { wrapper });

    act(() => {
      result.current.handleDragEnd({ active: { id: "i1" }, over: null } as never);
    });
    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);

    act(() => {
      result.current.handleDragEnd({ active: { id: "i1" }, over: { id: "i1" } } as never);
    });
    expect(result.current.orderedItems.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);
  });
});
