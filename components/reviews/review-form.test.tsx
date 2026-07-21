import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/mocks/server";
import { ReviewForm } from "./review-form";
import enMessages from "@/messages/en.json";

function renderForm(props: Partial<React.ComponentProps<typeof ReviewForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReviewForm bookId="b1" onSuccess={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReviewForm", () => {
  it("submits a new review with rating and body", async () => {
    server.use(
      http.post("/api/reviews", () => HttpResponse.json({ id: "r1", rating: 5 }, { status: 201 })),
    );
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSuccess });
    await user.click(screen.getByRole("radio", { name: "5" }));
    await user.type(screen.getByRole("textbox", { name: /review/i }), "Great book.");
    await user.click(screen.getByRole("button", { name: /post review/i }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it("pre-fills fields when editing an existing review", () => {
    renderForm({
      bookId: undefined,
      review: {
        id: "r1",
        user_id: "u1",
        book_id: "b1",
        release_id: null,
        rating: 4,
        title: "Good",
        body: "Solid read.",
        is_public: true,
        contains_spoilers: false,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    });
    expect(screen.getByDisplayValue("Solid read.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
  });

  it("surfaces the exactly-one-of-book-or-release 422 as a form-level error", async () => {
    server.use(
      http.post("/api/reviews", () =>
        HttpResponse.json(
          {
            detail: [
              {
                msg: "Value error, exactly one of book_id or release_id is required",
                loc: ["body"],
              },
            ],
          },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /post review/i }));
    await waitFor(() =>
      expect(screen.getByText(/pick a book or a specific edition/i)).toBeInTheDocument(),
    );
  });
});
