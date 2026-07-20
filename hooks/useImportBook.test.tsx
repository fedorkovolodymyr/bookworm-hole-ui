// hooks/useImportBook.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/mocks/server";
import { useImportBook } from "./useImportBook";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useImportBook", () => {
  it("imports a book and returns default rating fields", async () => {
    server.use(
      http.post("/api/external/import", () => {
        return HttpResponse.json({
          id: "imported-1",
          title: "Imported Book",
          releases: [],
          average_rating: null,
          rating_count: 0,
        });
      }),
    );
    const { result } = renderHook(() => useImportBook(), { wrapper });
    act(() => result.current.mutate({ source: "google_books", source_id: "abc123" }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.rating_count).toBe(0);
    expect(result.current.data?.average_rating).toBeNull();
  });
});
