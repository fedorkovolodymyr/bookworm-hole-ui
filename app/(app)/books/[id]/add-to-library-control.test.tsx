import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { AddToLibraryControl } from "./add-to-library-control";
import enMessages from "@/messages/en.json";

function renderControl() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AddToLibraryControl bookId="b1" />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("AddToLibraryControl", () => {
  it("creates a status when a kind is selected", async () => {
    let capturedBody: unknown;
    server.use(
      http.post("/api/me/statuses", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: "s1", status: "wishlist" }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByRole("combobox"));
    const option = await screen.findByRole("option", { name: "Wishlist" });
    await user.click(option);
    await waitFor(() => expect(capturedBody).toMatchObject({ book_id: "b1", status: "wishlist" }));
  });
});
