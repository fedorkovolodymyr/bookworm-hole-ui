// hooks/useReleases.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useRelease } from "./useReleases";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useRelease", () => {
  it("fetches a release by id", async () => {
    server.use(
      http.get("/api/releases/:id", ({ params }) =>
        HttpResponse.json({
          id: params.id,
          format: "hardcover",
          publisher: "Ace Books",
          published_year: 1965,
          language: "en",
          page_count: 412,
          duration_minutes: null,
          cover_image_url: null,
          description_override: null,
          isbns: [],
          average_rating: null,
          rating_count: 0,
        }),
      ),
    );
    const { result } = renderHook(() => useRelease("r1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.publisher).toBe("Ace Books");
  });

  it("surfaces a 404 error", async () => {
    server.use(
      http.get("/api/releases/:id", () =>
        HttpResponse.json({ detail: "Release not found" }, { status: 404 }),
      ),
    );
    const { result } = renderHook(() => useRelease("missing"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not fetch when releaseId is undefined", () => {
    const { result } = renderHook(() => useRelease(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
