import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  useCreateStatus,
  useLendStatus,
  useLibrary,
  useReturnStatus,
  useStatuses,
} from "./useStatuses";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useStatuses", () => {
  it("fetches all statuses", async () => {
    server.use(
      http.get("/api/me/statuses", () => HttpResponse.json([{ id: "s1", status: "owned" }])),
    );
    const { result } = renderHook(() => useStatuses(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("s1");
  });
});

describe("useLibrary", () => {
  it("fetches the paginated library view", async () => {
    server.use(
      http.get("/api/me/library", () =>
        HttpResponse.json({ items: [{ id: "s1" }], total: 1, limit: 10, offset: 0 }),
      ),
    );
    const { result } = renderHook(() => useLibrary(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0].id).toBe("s1");
  });
});

describe("useCreateStatus", () => {
  it("creates a status and invalidates statuses broadly", async () => {
    server.use(
      http.post("/api/me/statuses", () =>
        HttpResponse.json({ id: "s1", status: "wishlist" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useCreateStatus(), { wrapper });
    result.current.mutate({ book_id: "b1", status: "wishlist" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useLendStatus", () => {
  it("lends a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/lend", () =>
        HttpResponse.json({ id: "s1", status: "lent_out" }),
      ),
    );
    const { result } = renderHook(() => useLendStatus("s1"), { wrapper });
    result.current.mutate({ lent_to_name: "Alex" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useReturnStatus", () => {
  it("returns a status", async () => {
    server.use(
      http.post("/api/me/statuses/:id/return", () =>
        HttpResponse.json({ id: "s1", status: "owned" }),
      ),
    );
    const { result } = renderHook(() => useReturnStatus("s1"), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
