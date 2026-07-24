import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { PasswordResetDialog } from "./password-reset-dialog";
import * as useAdminUsersHooks from "@/hooks/useAdminUsers";

vi.mock("@/hooks/useAdminUsers");

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("PasswordResetDialog", () => {
  beforeEach(() => {
    vi.mocked(useAdminUsersHooks.useResetUserPassword).mockReturnValue({
      mutate: vi.fn(),
      data: undefined,
      isPending: true,
    } as never);
  });

  it("shows a loading state while the reset is pending", () => {
    renderWithIntl(<PasswordResetDialog userId="u1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("Password reset token")).toBeInTheDocument();
  });

  it("shows the reset token once available", () => {
    vi.mocked(useAdminUsersHooks.useResetUserPassword).mockReturnValue({
      mutate: vi.fn(),
      data: { reset_token: "tok-abc-123" },
      isPending: false,
    } as never);

    renderWithIntl(<PasswordResetDialog userId="u1" open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText("tok-abc-123")).toBeInTheDocument();
  });
});
