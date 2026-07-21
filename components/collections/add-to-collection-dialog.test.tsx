// components/collections/add-to-collection-dialog.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import enMessages from "@/messages/en.json";

function renderDialog(props: Partial<React.ComponentProps<typeof AddToCollectionDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AddToCollectionDialog bookId="b1" {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("AddToCollectionDialog", () => {
  it("lists the user's collections and adds the book on selection", async () => {
    server.use(
      http.get("/api/collections", () =>
        HttpResponse.json({ items: [{ id: "c1", name: "Favorites" }], total: 1, limit: 10, offset: 0 }),
      ),
      http.post("/api/collections/:id/items", () =>
        HttpResponse.json({ id: "i1", collection_id: "c1", book_id: "b1" }, { status: 201 }),
      ),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /add to collection/i }));
    await waitFor(() => expect(screen.getByText("Favorites")).toBeInTheDocument());
    await user.click(screen.getByText("Favorites"));
    await waitFor(() => expect(screen.getByText(/added to favorites/i)).toBeInTheDocument());
  });

  it("shows an empty state when the user has no collections", async () => {
    server.use(
      http.get("/api/collections", () => HttpResponse.json({ items: [], total: 0, limit: 10, offset: 0 })),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: /add to collection/i }));
    await waitFor(() => expect(screen.getByText(/don't have any collections/i)).toBeInTheDocument());
  });
});
