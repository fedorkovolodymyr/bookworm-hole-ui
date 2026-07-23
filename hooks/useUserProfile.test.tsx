import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { usePublicProfile, useUserReviews } from "./useUserProfile";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("usePublicProfile", () => {
  it("fetches a public profile by username", async () => {
    server.use(
      http.get("/api/users/bob", () =>
        HttpResponse.json({
          username: "bob",
          display_name: "Bob",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 20, offset: 0 },
        }),
      ),
    );
    const { result } = renderHook(() => usePublicProfile("bob"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.username).toBe("bob");
  });

  it("does not fetch when username is undefined", () => {
    const { result } = renderHook(() => usePublicProfile(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUserReviews", () => {
  it("fetches a user's reviews", async () => {
    server.use(
      http.get("/api/users/u1/reviews", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useUserReviews("u1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
  });
});
