import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { BookCard } from "./book-card";
import enMessages from "@/messages/en.json";
import type { BookResponse } from "@/lib/api/types";

const book: BookResponse = {
  id: "b1",
  title: "Dune",
  original_title: null,
  original_language: null,
  first_publication_year: 1965,
  description: "A sci-fi epic.",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderCard(overrides: Partial<BookResponse> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <BookCard book={{ ...book, ...overrides }} />
    </NextIntlClientProvider>,
  );
}

describe("BookCard", () => {
  it("renders title and publication year", () => {
    renderCard();
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.getByText(/1965/)).toBeInTheDocument();
  });

  it("links to the book detail page", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/books/b1");
  });

  it("shows a fallback when description is empty", () => {
    renderCard({ description: "" });
    expect(screen.getByText("No description available.")).toBeInTheDocument();
  });
});
