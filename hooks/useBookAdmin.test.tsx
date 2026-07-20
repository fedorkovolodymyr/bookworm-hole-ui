// hooks/useBookAdmin.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/mocks/server";
import { useCreateBook, useMergeBooks } from "./useBookAdmin";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useCreateBook", () => {
  it("creates a book", async () => {
    server.use(
      http.post("/api/books", async ({ request }) => {
        const body = (await request.json()) as { title: string };
        return HttpResponse.json({ id: "new-book", title: body.title }, { status: 201 });
      }),
    );
    const { result } = renderHook(() => useCreateBook(), { wrapper });
    act(() => result.current.mutate({ title: "Dune", description: "Sci-fi classic" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Dune");
  });
});

describe("useMergeBooks", () => {
  it("merges two distinct books", async () => {
    server.use(
      http.post("/api/books/:sourceId/merge-into/:targetId", ({ params }) => {
        if (params.sourceId === params.targetId) {
          return HttpResponse.json({ detail: "Cannot merge a book into itself" }, { status: 409 });
        }
        return HttpResponse.json({ id: params.targetId, title: "Merged", releases: [] });
      }),
    );
    const { result } = renderHook(() => useMergeBooks(), { wrapper });
    act(() => result.current.mutate({ sourceId: "a", targetId: "b" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("surfaces a 409 when merging a book into itself", async () => {
    server.use(
      http.post("/api/books/:sourceId/merge-into/:targetId", ({ params }) => {
        if (params.sourceId === params.targetId) {
          return HttpResponse.json({ detail: "Cannot merge a book into itself" }, { status: 409 });
        }
        return HttpResponse.json({ id: params.targetId, title: "Merged", releases: [] });
      }),
    );
    const { result } = renderHook(() => useMergeBooks(), { wrapper });
    act(() => result.current.mutate({ sourceId: "a", targetId: "a" }));
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
