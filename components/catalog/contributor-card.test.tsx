import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { ContributorCard } from "./contributor-card";
import enMessages from "@/messages/en.json";
import type { ContributorResponse } from "@/lib/api/types";

const contributor: ContributorResponse = {
  id: "c1",
  full_name: "Frank Herbert",
  sort_name: "Herbert, Frank",
  birth_year: 1920,
  death_year: 1986,
  bio: "American science fiction writer.",
  slug: "frank-herbert",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

describe("ContributorCard", () => {
  it("renders name and links to detail page", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ContributorCard contributor={contributor} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Frank Herbert")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/contributors/c1");
  });

  it("shows a fallback when bio is missing", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ContributorCard contributor={{ ...contributor, bio: null }} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("No biography available.")).toBeInTheDocument();
  });
});
