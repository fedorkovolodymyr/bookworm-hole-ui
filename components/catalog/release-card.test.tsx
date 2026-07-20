import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { ReleaseCard } from "./release-card";
import enMessages from "@/messages/en.json";
import type { ReleaseWithISBNsResponse } from "@/lib/api/types";

const release: ReleaseWithISBNsResponse = {
  id: "r1",
  format: "hardcover",
  publisher: "Ace Books",
  published_year: 1965,
  language: "en",
  page_count: 412,
  duration_minutes: null,
  cover_image_url: null,
  description_override: null,
  isbns: [],
  average_rating: 4.5,
  rating_count: 10,
};

function renderCard(overrides: Partial<ReleaseWithISBNsResponse> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ReleaseCard release={{ ...release, ...overrides }} />
    </NextIntlClientProvider>,
  );
}

describe("ReleaseCard", () => {
  it("renders publisher and format", () => {
    renderCard();
    expect(screen.getByText("Ace Books")).toBeInTheDocument();
    expect(screen.getByText("Hardcover")).toBeInTheDocument();
  });

  it("shows a rating count when rated", () => {
    renderCard();
    expect(screen.getByText("10 ratings")).toBeInTheDocument();
  });

  it("shows a fallback when unrated", () => {
    renderCard({ average_rating: null, rating_count: 0 });
    expect(screen.getByText("Not yet rated")).toBeInTheDocument();
  });
});
