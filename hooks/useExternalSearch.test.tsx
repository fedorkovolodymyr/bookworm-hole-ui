// hooks/useExternalSearch.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useExternalSearch } from "./useExternalSearch";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useExternalSearch", () => {
  it("searches when query is non-empty", async () => {
    server.use(
      http.get("/api/external/search", ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json({
          query: url.searchParams.get("q"),
          hits: [
            {
              source: "google_books",
              title: "Dune",
              isbns: ["123"],
              authors: ["Frank Herbert"],
              cover_image_url: null,
            },
          ],
          partial_failures: {},
        });
      }),
    );
    const { result } = renderHook(() => useExternalSearch("dune"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.hits[0].title).toBe("Dune");
  });

  it("surfaces an error from the external search endpoint", async () => {
    server.use(
      http.get("/api/external/search", () =>
        HttpResponse.json({ detail: "External search failed" }, { status: 502 }),
      ),
    );
    const { result } = renderHook(() => useExternalSearch("dune"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not search when query is empty", () => {
    const { result } = renderHook(() => useExternalSearch(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
