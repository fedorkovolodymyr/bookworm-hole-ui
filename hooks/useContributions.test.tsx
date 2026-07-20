// hooks/useContributions.test.tsx
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/mocks/server";
import {
  useCreateContribution,
  useMyContributions,
  useSubmitContribution,
} from "./useContributions";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useCreateContribution", () => {
  it("creates a draft contribution", async () => {
    server.use(
      http.post("/api/contributions", async ({ request }) => {
        const body = (await request.json()) as { kind: string };
        return HttpResponse.json(
          {
            id: "c1",
            user_id: "u1",
            kind: body.kind,
            target_id: null,
            payload: {},
            status: "draft",
            reviewer_id: null,
            review_notes: null,
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2020-01-01T00:00:00Z",
          },
          { status: 201 },
        );
      }),
    );
    const { result } = renderHook(() => useCreateContribution(), { wrapper });
    act(() => result.current.mutate({ kind: "new_book", payload: { title: "Dune" } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("draft");
  });
});

describe("useSubmitContribution", () => {
  it("submits a draft contribution", async () => {
    server.use(
      http.post("/api/contributions/:id/submit", ({ params }) => {
        return HttpResponse.json({
          id: params.id,
          user_id: "u1",
          kind: "new_book",
          target_id: null,
          payload: {},
          status: "submitted",
          reviewer_id: null,
          review_notes: null,
          created_at: "2020-01-01T00:00:00Z",
          updated_at: "2020-01-01T00:00:00Z",
        });
      }),
    );
    const { result } = renderHook(() => useSubmitContribution(), { wrapper });
    act(() => result.current.mutate("c1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe("submitted");
  });
});

describe("useMyContributions", () => {
  it("lists the current user's contributions", async () => {
    server.use(
      http.get("/api/contributions/me/contributions", () => {
        return HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 });
      }),
    );
    const { result } = renderHook(() => useMyContributions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toEqual([]);
  });
});
