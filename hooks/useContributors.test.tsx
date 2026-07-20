// hooks/useContributors.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useContributor, useContributorList } from "./useContributors";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useContributorList", () => {
  it("fetches a page of contributors", async () => {
    server.use(
      http.get("/api/contributors", () =>
        HttpResponse.json({
          items: [{ id: "c1", full_name: "Frank Herbert", sort_name: "Herbert, Frank" }],
          total: 1,
          limit: 10,
          offset: 0,
        }),
      ),
    );
    const { result } = renderHook(() => useContributorList(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].full_name).toBe("Frank Herbert");
  });
});

describe("useContributor", () => {
  it("fetches a contributor by id with books_by_role", async () => {
    server.use(
      http.get("/api/contributors/:id", ({ params }) =>
        HttpResponse.json({
          id: params.id,
          full_name: "Frank Herbert",
          sort_name: "Herbert, Frank",
          birth_year: 1920,
          death_year: 1986,
          bio: null,
          slug: "frank-herbert",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
          books_by_role: { author: [{ id: "b1", title: "Dune" }] },
          releases_by_role: {},
        }),
      ),
    );
    const { result } = renderHook(() => useContributor("c1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.books_by_role.author?.[0].title).toBe("Dune");
  });

  it("surfaces a 404 error", async () => {
    server.use(
      http.get("/api/contributors/:id", () =>
        HttpResponse.json({ detail: "Contributor not found" }, { status: 404 }),
      ),
    );
    const { result } = renderHook(() => useContributor("missing"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not fetch when contributorId is undefined", () => {
    const { result } = renderHook(() => useContributor(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
