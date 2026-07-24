import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { RejectContributionDialog } from "./reject-contribution-dialog";
import * as useAdminContributionsHooks from "@/hooks/useAdminContributions";

vi.mock("@/hooks/useAdminContributions");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("RejectContributionDialog", () => {
  beforeEach(() => {
    vi.mocked(useAdminContributionsHooks.useRejectContribution).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      error: null,
    } as never);
  });

  it("disables the confirm button when notes are empty", () => {
    renderWithIntl(
      <RejectContributionDialog contributionId="c1" open={true} onOpenChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  });

  it("enables the confirm button once notes are entered and submits them", () => {
    const mutate = vi.fn();
    vi.mocked(useAdminContributionsHooks.useRejectContribution).mockReturnValue({
      mutate,
      isPending: false,
      error: null,
    } as never);

    renderWithIntl(
      <RejectContributionDialog contributionId="c1" open={true} onOpenChange={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Bad data" },
    });
    const confirmButton = screen.getByRole("button", { name: "Reject" });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(mutate).toHaveBeenCalledWith(
      { contributionId: "c1", payload: { notes: "Bad data" } },
      expect.anything(),
    );
  });
});
