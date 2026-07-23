import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import FriendsPage from "./page";

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={messages}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("FriendsPage", () => {
  it("shows the friends tab by default with the friend list", async () => {
    server.use(
      http.get("/api/friends/", () =>
        HttpResponse.json([
          {
            user_id: "u1",
            username: "bob",
            display_name: "Bob",
            avatar_url: null,
            since: "2026-01-01T00:00:00Z",
          },
        ]),
      ),
      http.get("/api/friends/requests/incoming", () => HttpResponse.json([])),
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([])),
    );
    renderWithProviders(<FriendsPage />);
    await waitFor(() => expect(screen.getByText("Bob")).toBeInTheDocument());
  });

  it("switches to the requests tab and accepts an incoming request", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([])),
      http.get("/api/friends/requests/incoming", () =>
        HttpResponse.json([
          {
            id: "f1",
            requester_id: "u2",
            addressee_id: "u1",
            status: "pending",
            created_at: "now",
            responded_at: null,
          },
        ]),
      ),
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([])),
      http.post("/api/friends/requests/f1/accept", () =>
        HttpResponse.json({ id: "f1", status: "accepted" }),
      ),
    );
    renderWithProviders(<FriendsPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Requests" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Accept" }));
  });

  it("switches to the find-people tab and shows the form", async () => {
    server.use(
      http.get("/api/friends/", () => HttpResponse.json([])),
      http.get("/api/friends/requests/incoming", () => HttpResponse.json([])),
      http.get("/api/friends/requests/outgoing", () => HttpResponse.json([])),
    );
    renderWithProviders(<FriendsPage />);
    await userEvent.click(screen.getByRole("tab", { name: "Find people" }));
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
  });
});
