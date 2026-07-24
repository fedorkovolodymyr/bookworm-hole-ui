import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ContributionReviewList } from "./contribution-review-list";
import * as useAdminContributionsHooks from "@/hooks/useAdminContributions";
import type { AdminContributionResponse } from "@/lib/api/types";

vi.mock("@/hooks/useAdminContributions");

const contributions: AdminContributionResponse[] = [
  {
    id: "c1",
    user_id: "u1",
    kind: "new_book",
    target_id: null,
    payload: {},
    status: "submitted",
    reviewer_id: null,
    review_notes: null,
    created_at: "2026-07-24T10:00:00Z",
    updated_at: "2026-07-24T10:00:00Z",
    warnings: [],
  },
];

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ContributionReviewList", () => {
  beforeEach(() => {
    vi.mocked(useAdminContributionsHooks.useClaimContribution).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as never);
  });

  it("renders a card per contribution", () => {
    renderWithIntl(
      <ContributionReviewList contributions={contributions} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("new_book")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("shows an empty state when there are no contributions", () => {
    renderWithIntl(<ContributionReviewList contributions={[]} onSelect={vi.fn()} />);
    expect(screen.getByText("No contributions in this status.")).toBeInTheDocument();
  });

  it("calls onSelect when 'View diff' is clicked", () => {
    const onSelect = vi.fn();
    renderWithIntl(
      <ContributionReviewList contributions={contributions} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "View diff" }));
    expect(onSelect).toHaveBeenCalledWith("c1");
  });
});
