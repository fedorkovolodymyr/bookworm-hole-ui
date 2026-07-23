import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import FriendShelfPage from "./page";

const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

// `use(params)` (React 19) suspends on first render even for an
// already-resolved promise, since it always throws to trigger the Suspense
// protocol before its microtask retry runs. There's no Suspense boundary
// around this route in tests, so the retry must be flushed inside `act`
// before `waitFor` polling starts, or the suspended tree never recovers.
async function renderWithProviders(userId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <FriendShelfPage params={Promise.resolve({ userId })} />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );
  });
  return result;
}

describe("FriendShelfPage (profile header)", () => {
  it("shows friend header with Unfriend/Block actions when already friends", async () => {
    server.use(
      http.get("/api/friends/", () =>
        HttpResponse.json([
          {
            user_id: "u1",
            username: "bob",
            display_name: "Bob Reader",
            avatar_url: null,
            since: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
      http.get("/api/friends/u1/collections", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.get("/api/friends/u1/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    await renderWithProviders("u1");
    await waitFor(() => expect(screen.getByText("Bob Reader")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Unfriend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Block" })).toBeInTheDocument();
  });

  it("shows no friend header when the viewed user is not yet a friend", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([])),
      http.get("/api/friends/u2/collections", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.get("/api/friends/u2/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
    );
    await renderWithProviders("u2");
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Unfriend" })).not.toBeInTheDocument(),
    );
  });

  it("navigates to the new thread when Message succeeds", async () => {
    server.use(
      http.get("/api/friends/", () =>
        HttpResponse.json([
          {
            user_id: "u1",
            username: "bob",
            display_name: "Bob Reader",
            avatar_url: null,
            since: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
      http.get("/api/friends/u1/collections", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.get("/api/friends/u1/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.post("/api/chat/threads", () =>
        HttpResponse.json({
          id: "t9",
          user_a_id: "1",
          user_b_id: "u1",
          created_at: "2026-01-01T00:00:00Z",
          last_message_at: null,
        }),
      ),
    );
    await renderWithProviders("u1");
    await waitFor(() => expect(screen.getByText("Bob Reader")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Message" }));
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith("/chat/t9"));
  });

  it("shows an inline error when Message is rejected as not-a-friend", async () => {
    server.use(
      http.get("/api/friends/", () =>
        HttpResponse.json([
          {
            user_id: "u1",
            username: "bob",
            display_name: "Bob Reader",
            avatar_url: null,
            since: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
      http.get("/api/friends/u1/collections", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.get("/api/friends/u1/library", () =>
        HttpResponse.json({ items: [], total: 0, limit: 20, offset: 0 }),
      ),
      http.post("/api/chat/threads", () =>
        HttpResponse.json({ detail: "You can only message your friends" }, { status: 401 }),
      ),
    );
    await renderWithProviders("u1");
    await waitFor(() => expect(screen.getByText("Bob Reader")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Message" }));
    expect(await screen.findByText("You can only message your friends.")).toBeInTheDocument();
  });
});
