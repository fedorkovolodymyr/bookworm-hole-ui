import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { EmailVerificationBanner } from "./email-verification-banner";

describe("EmailVerificationBanner", () => {
  it("does not render when the email is already verified", () => {
    render(
      <AppQueryProvider>
        <EmailVerificationBanner emailVerifiedAt="2026-01-01T00:00:00Z" />
      </AppQueryProvider>,
    );
    expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument();
  });

  it("renders a resend button when unverified, and shows a sent confirmation on click", async () => {
    render(
      <AppQueryProvider>
        <EmailVerificationBanner emailVerifiedAt={null} />
      </AppQueryProvider>,
    );
    expect(screen.getByText(/verify your email/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    expect(await screen.findByText(/verification email sent/i)).toBeInTheDocument();
  });
});
