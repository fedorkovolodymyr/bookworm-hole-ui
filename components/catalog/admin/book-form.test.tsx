import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { BookForm } from "./book-form";
import enMessages from "@/messages/en.json";
import type { BookResponse } from "@/lib/api/types";

const existingBook: BookResponse = {
  id: "b1",
  title: "Dune",
  original_title: null,
  original_language: null,
  first_publication_year: 1965,
  description: "A sci-fi epic.",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderForm(book?: BookResponse, onSuccess = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <BookForm book={book} onSuccess={onSuccess} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return onSuccess;
}

describe("BookForm", () => {
  it("creates a book on submit", async () => {
    server.use(
      http.post("/api/books", async ({ request }) => {
        const body = (await request.json()) as { title: string; description: string };
        return HttpResponse.json(
          { id: "new-book", title: body.title, description: body.description },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    const onSuccess = renderForm();
    await user.type(screen.getByLabelText("Title"), "Dune");
    await user.type(screen.getByLabelText("Description"), "A sci-fi epic.");
    await user.click(screen.getByRole("button", { name: "Create book" }));
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("pre-fills fields when editing an existing book", () => {
    renderForm(existingBook);
    expect(screen.getByLabelText("Title")).toHaveValue("Dune");
    expect(screen.getByLabelText("Description")).toHaveValue("A sci-fi epic.");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});
