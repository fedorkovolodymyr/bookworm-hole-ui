import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { MergeBooksDialog } from "./merge-books-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <MergeBooksDialog sourceBookId="b1" sourceBookTitle="Dune" onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("MergeBooksDialog", () => {
  it("merges into a different target book", async () => {
    server.use(
      http.post("/api/books/:sourceId/merge-into/:targetId", ({ params }) => {
        if (params.sourceId === params.targetId) {
          return HttpResponse.json({ detail: "Cannot merge a book into itself" }, { status: 409 });
        }
        return HttpResponse.json({ id: params.targetId, title: "Merged", releases: [] });
      }),
    );
    const user = userEvent.setup();
    const onSuccess = renderDialog();
    await user.click(screen.getByRole("button", { name: "Merge into another book" }));
    await user.type(screen.getByLabelText("Target book ID"), "b2");
    await user.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("shows an error when merging into itself", async () => {
    server.use(
      http.post("/api/books/:sourceId/merge-into/:targetId", ({ params }) => {
        if (params.sourceId === params.targetId) {
          return HttpResponse.json({ detail: "Cannot merge a book into itself" }, { status: 409 });
        }
        return HttpResponse.json({ id: params.targetId, title: "Merged", releases: [] });
      }),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Merge into another book" }));
    await user.type(screen.getByLabelText("Target book ID"), "b1");
    await user.click(screen.getByRole("button", { name: "Merge" }));
    await waitFor(() =>
      expect(screen.getByText("Cannot merge a book into itself")).toBeInTheDocument(),
    );
  });
});
