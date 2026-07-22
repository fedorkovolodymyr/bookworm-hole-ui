// components/collections/collection-card.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { CollectionCard } from "./collection-card";
import enMessages from "@/messages/en.json";
import type { CollectionResponse } from "@/lib/api/types";

const collection: CollectionResponse = {
  id: "c1",
  user_id: "u1",
  name: "Favorites",
  description: "My favorite reads",
  is_public: true,
  cover_image_url: null,
  sort_order: 0,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderCard(overrides: Partial<CollectionResponse> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <CollectionCard collection={{ ...collection, ...overrides }} />
    </NextIntlClientProvider>,
  );
}

describe("CollectionCard", () => {
  it("renders the name and description", () => {
    renderCard();
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("My favorite reads")).toBeInTheDocument();
  });

  it("links to the collection detail page", () => {
    renderCard();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/collections/c1");
  });
});
