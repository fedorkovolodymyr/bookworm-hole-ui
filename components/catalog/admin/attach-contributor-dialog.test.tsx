import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { AttachContributorDialog } from "./attach-contributor-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AttachContributorDialog bookId="b1" onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("AttachContributorDialog", () => {
  it("attaches a contributor with a role", async () => {
    server.use(
      http.get("/api/contributors", () => {
        return HttpResponse.json({
          items: [
            {
              id: "c1",
              full_name: "Frank Herbert",
              sort_name: "Herbert, Frank",
              slug: "frank-herbert",
            },
          ],
          total: 1,
          limit: 10,
          offset: 0,
        });
      }),
      http.post("/api/books/:bookId/contributors", () => {
        return HttpResponse.json({ status: "created" });
      }),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Add contributor" }));
    await waitFor(() => expect(screen.getByText("Frank Herbert")).toBeInTheDocument());
  });

  it("shows an already-existed message when the API returns status already_existed", async () => {
    server.use(
      http.get("/api/contributors", () => {
        return HttpResponse.json({
          items: [
            {
              id: "c1",
              full_name: "Frank Herbert",
              sort_name: "Herbert, Frank",
              slug: "frank-herbert",
            },
          ],
          total: 1,
          limit: 10,
          offset: 0,
        });
      }),
      http.post("/api/books/:bookId/contributors", () => {
        return HttpResponse.json({ status: "already_existed" }, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Add contributor" }));
    await waitFor(() => expect(screen.getByText("Frank Herbert")).toBeInTheDocument());
    const [contributorCombobox] = screen.getAllByRole("combobox");
    await user.click(contributorCombobox);
    const option = await screen.findByRole("option", { name: "Frank Herbert" });
    await user.click(option);
    await user.click(screen.getByRole("button", { name: "Add" }));
    await waitFor(() =>
      expect(
        screen.getByText("This contributor already has this role on the book."),
      ).toBeInTheDocument(),
    );
  });
});
