import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";
import type { ReviewResponse } from "@/lib/api/types";

const review: ReviewResponse = {
  id: "rev1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  rating: 5,
  title: "Loved it",
  body: "Great book.",
  is_public: true,
  contains_spoilers: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderList(reviews: ReviewResponse[], isLoading = false) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ReviewList reviews={reviews} isLoading={isLoading} />
    </NextIntlClientProvider>,
  );
}

describe("ReviewList", () => {
  it("renders review titles", () => {
    renderList([review]);
    expect(screen.getByText("Loved it")).toBeInTheDocument();
  });

  it("shows a spoiler warning badge when applicable", () => {
    renderList([{ ...review, contains_spoilers: true }]);
    expect(screen.getByText("Contains spoilers")).toBeInTheDocument();
  });

  it("shows an empty state with no reviews", () => {
    renderList([]);
    expect(screen.getByText("No reviews yet.")).toBeInTheDocument();
  });

  it("shows a loading state", () => {
    renderList([], true);
    expect(screen.getByText("Loading reviews...")).toBeInTheDocument();
  });
});
