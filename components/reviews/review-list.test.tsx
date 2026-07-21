import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";
import type { ReviewResponse } from "@/lib/api/types";

function renderList(props: Partial<React.ComponentProps<typeof ReviewList>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ReviewList reviews={[]} isLoading={false} onEdit={vi.fn()} {...props} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe("ReviewList", () => {
  it("shows a loading state", () => {
    renderList({ isLoading: true });
    expect(screen.getByText(/loading reviews/i)).toBeInTheDocument();
  });

  it("shows an empty state", () => {
    renderList({ reviews: [] });
    expect(screen.getByText(/no reviews yet/i)).toBeInTheDocument();
  });

  it("renders a review card per review", () => {
    const reviews: ReviewResponse[] = [
      {
        id: "r1",
        user_id: "u1",
        book_id: "b1",
        release_id: null,
        rating: 4,
        title: "Good",
        body: "Solid.",
        is_public: true,
        contains_spoilers: false,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    ];
    renderList({ reviews });
    expect(screen.getByText("Good")).toBeInTheDocument();
  });
});
