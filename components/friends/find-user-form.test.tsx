import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import messages from "@/messages/en.json";
import { FindUserForm } from "./find-user-form";

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

describe("FindUserForm", () => {
  it("shows a not-found message on 404", async () => {
    server.use(http.get("/api/users/ghost", () => new HttpResponse(null, { status: 404 })));
    renderWithProviders(<FindUserForm />);
    await userEvent.type(screen.getByLabelText("Username"), "ghost");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await waitFor(() =>
      expect(screen.getByText("No user found with that username.")).toBeInTheDocument(),
    );
  });

  it("shows a profile preview with a send-request button on success", async () => {
    server.use(
      http.get("/api/users/bob", () =>
        HttpResponse.json({
          username: "bob",
          display_name: "Bob Reader",
          bio: null,
          avatar_url: null,
          collections: { items: [], total: 0, limit: 20, offset: 0 },
        }),
      ),
      http.post("/api/friends/requests", () =>
        HttpResponse.json({ id: "f1", status: "pending" }, { status: 201 }),
      ),
    );
    renderWithProviders(<FindUserForm />);
    await userEvent.type(screen.getByLabelText("Username"), "bob");
    await userEvent.click(screen.getByRole("button", { name: "Find" }));
    await waitFor(() => expect(screen.getByText("Bob Reader")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Send friend request" }));
    await waitFor(() => expect(screen.getByText("Friend request sent.")).toBeInTheDocument());
  });
});
