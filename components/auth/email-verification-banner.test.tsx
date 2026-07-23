import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { AppQueryProvider } from "@/lib/query-client";
import { EmailVerificationBanner } from "./email-verification-banner";
import messages from "@/messages/en.json";

function renderBanner(emailVerifiedAt: string | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AppQueryProvider>
        <EmailVerificationBanner emailVerifiedAt={emailVerifiedAt} />
      </AppQueryProvider>
    </NextIntlClientProvider>,
  );
}

describe("EmailVerificationBanner", () => {
  it("does not render when the email is already verified", () => {
    renderBanner("2026-01-01T00:00:00Z");
    expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
  });

  it("renders a resend button when unverified, and shows a sent confirmation on click", async () => {
    renderBanner(null);
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
  });
});
