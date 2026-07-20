// hooks/useBooks.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useBook, useBookList } from "./useBooks";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useBookList", () => {
  it("fetches a page of books", async () => {
    server.use(
      http.get("/api/books", () =>
        HttpResponse.json({ items: [{ id: "b1", title: "Dune" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useBookList(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].title).toBe("Dune");
  });
});

describe("useBook", () => {
  it("fetches a book by id", async () => {
    server.use(
      http.get("/api/books/:id", ({ params }) =>
        HttpResponse.json({ id: params.id, title: "Dune", releases: [] }),
      ),
    );
    const { result } = renderHook(() => useBook("b1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe("Dune");
  });

  it("surfaces a 404 error", async () => {
    server.use(
      http.get("/api/books/:id", () =>
        HttpResponse.json({ detail: "Book not found" }, { status: 404 }),
      ),
    );
    const { result } = renderHook(() => useBook("missing"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not fetch when bookId is undefined", () => {
    const { result } = renderHook(() => useBook(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
