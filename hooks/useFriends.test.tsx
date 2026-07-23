import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import {
  useAcceptFriendRequest,
  useBlockUser,
  useDeclineFriendRequest,
  useFriends,
  useIncomingRequests,
  useOutgoingRequests,
  useRemoveFriend,
  useSendFriendRequest,
  useUnblockUser,
} from "./useFriends";

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useFriends", () => {
  it("fetches the friend list", async () => {
    server.use(http.get("/api/friends/", () => HttpResponse.json([{ user_id: "u1" }])));
    const { result } = renderHook(() => useFriends(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].user_id).toBe("u1");
  });
});

describe("useIncomingRequests / useOutgoingRequests", () => {
  it("fetches incoming requests", async () => {
    server.use(
      http.get("/api/friends/requests/incoming", () => HttpResponse.json([{ id: "f1" }])),
    );
    const { result } = renderHook(() => useIncomingRequests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("f1");
  });

  it("fetches outgoing requests", async () => {
    server.use(
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([{ id: "f2" }])),
    );
    const { result } = renderHook(() => useOutgoingRequests(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].id).toBe("f2");
  });
});

describe("useSendFriendRequest", () => {
  it("sends a friend request", async () => {
    server.use(
      http.post("/api/friends/requests", () =>
        HttpResponse.json({ id: "f1", status: "pending" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useSendFriendRequest(), { wrapper });
    result.current.mutate({ username: "bob" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useAcceptFriendRequest", () => {
  it("accepts a request by friendship id", async () => {
    server.use(
      http.post("/api/friends/requests/f1/accept", () =>
        HttpResponse.json({ id: "f1", status: "accepted" }),
      ),
    );
    const { result } = renderHook(() => useAcceptFriendRequest(), { wrapper });
    result.current.mutate("f1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useDeclineFriendRequest", () => {
  it("declines a request by friendship id", async () => {
    server.use(
      http.post("/api/friends/requests/f1/decline", () =>
        HttpResponse.json({ id: "f1", status: "declined" }),
      ),
    );
    const { result } = renderHook(() => useDeclineFriendRequest(), { wrapper });
    result.current.mutate("f1");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useRemoveFriend", () => {
  it("removes a friend by user id", async () => {
    server.use(http.delete("/api/friends/u2", () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useRemoveFriend(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("useBlockUser / useUnblockUser", () => {
  it("blocks a user", async () => {
    server.use(
      http.post("/api/friends/u2/block", () =>
        HttpResponse.json({ id: "f3", status: "blocked" }, { status: 201 }),
      ),
    );
    const { result } = renderHook(() => useBlockUser(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("unblocks a user", async () => {
    server.use(http.delete("/api/friends/u2/block", () => new HttpResponse(null, { status: 204 })));
    const { result } = renderHook(() => useUnblockUser(), { wrapper });
    result.current.mutate("u2");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
