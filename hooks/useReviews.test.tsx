// hooks/useReviews.test.tsx
import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { useCreateReview, useDeleteReview, useReview, useUpdateReview } from "./useReviews";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useReview", () => {
  it("fetches a review by id", async () => {
    server.use(http.get("/api/reviews/:id", ({ params }) => HttpResponse.json({ id: params.id })));
    const { result } = renderHook(() => useReview("r1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe("r1");
  });

  it("does not fetch when id is undefined", () => {
    const { result } = renderHook(() => useReview(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useCreateReview", () => {
  it("creates a review", async () => {
    server.use(
      http.post("/api/reviews", () => HttpResponse.json({ id: "r1", rating: 5 }, { status: 201 })),
    );
    const { result } = renderHook(() => useCreateReview(), { wrapper });
    result.current.mutate({ book_id: "b1", rating: 5 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("surfaces the 422 exactly-one-of error", async () => {
    server.use(
      http.post("/api/reviews", () =>
        HttpResponse.json(
          {
            detail: [
              {
                msg: "Value error, exactly one of book_id or release_id is required",
                loc: ["body"],
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const { result } = renderHook(() => useCreateReview(), { wrapper });
    result.current.mutate({});
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateReview", () => {
  it("updates a review", async () => {
    server.use(http.patch("/api/reviews/:id", () => HttpResponse.json({ id: "r1", rating: 3 })));
    const { result } = renderHook(() => useUpdateReview("r1"), { wrapper });
    result.current.mutate({ rating: 3 });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeleteReview", () => {
  it("deletes a review", async () => {
    server.use(http.delete("/api/reviews/:id", () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useDeleteReview(), { wrapper });
    result.current.mutate("r1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
