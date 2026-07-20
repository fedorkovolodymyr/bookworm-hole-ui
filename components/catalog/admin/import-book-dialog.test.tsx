import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ImportBookDialog } from "./import-book-dialog";
import enMessages from "@/messages/en.json";
import type { ExternalSearchHit } from "@/lib/api/types";

const hit: ExternalSearchHit = {
  source: "google_books",
  title: "Dune",
  isbns: ["9780441013593"],
  authors: ["Frank Herbert"],
  cover_image_url: null,
};

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ImportBookDialog hit={hit} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ImportBookDialog", () => {
  it("imports the book on confirm", async () => {
    server.use(
      http.post("/api/external/import", () => {
        return HttpResponse.json({
          id: "imported-1",
          title: "Dune",
          releases: [],
          average_rating: null,
          rating_count: 0,
        });
      }),
    );
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(screen.getByRole("button", { name: "Import" }));
    await waitFor(() => expect(screen.getByText("Imported successfully.")).toBeInTheDocument());
  });
});
