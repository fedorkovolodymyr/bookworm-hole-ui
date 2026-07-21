import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewCard } from "./review-card";
import enMessages from "@/messages/en.json";
import type { ReviewResponse } from "@/lib/api/types";

const review: ReviewResponse = {
  id: "r1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  rating: 5,
  title: "Loved it",
  body: "A great read.",
  is_public: true,
  contains_spoilers: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderCard(props: Partial<React.ComponentProps<typeof ReviewCard>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReviewCard review={review} onEdit={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReviewCard", () => {
  it("renders title, rating, and body", () => {
    renderCard();
    expect(screen.getByText("Loved it")).toBeInTheDocument();
    expect(screen.getByText("A great read.")).toBeInTheDocument();
  });

  it("shows a spoiler badge when contains_spoilers is true", () => {
    renderCard({ review: { ...review, contains_spoilers: true } });
    expect(screen.getByText(/contains spoilers/i)).toBeInTheDocument();
  });

  it("shows edit/delete actions only for the review's own author", () => {
    renderCard({ currentUserId: "u1" });
    expect(screen.getByRole("button", { name: /delete review/i })).toBeInTheDocument();
  });

  it("hides edit/delete actions for other users", () => {
    renderCard({ currentUserId: "someone-else" });
    expect(screen.queryByRole("button", { name: /delete review/i })).not.toBeInTheDocument();
  });

  it("calls onEdit when edit is clicked", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    renderCard({ currentUserId: "u1", onEdit });
    await user.click(screen.getByRole("button", { name: /edit review/i }));
    expect(onEdit).toHaveBeenCalled();
  });
});
