import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { ChangePasswordForm } from "./change-password-form";

describe("ChangePasswordForm", () => {
  it("submits current and new password, shows success message, clears fields", async () => {
    render(
      <AppQueryProvider>
        <ChangePasswordForm />
      </AppQueryProvider>,
    );
    await userEvent.type(screen.getByLabelText("Current password"), "old-pw");
    await userEvent.type(screen.getByLabelText("New password"), "new-pw-123");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveValue("");
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });
});
