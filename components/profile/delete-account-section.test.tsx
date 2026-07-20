import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { AppQueryProvider } from "@/lib/query-client";
import { DeleteAccountSection } from "./delete-account-section";
import enMessages from "@/messages/en.json";

function renderDeleteAccountSection(deletionScheduledAt: string | null) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt={deletionScheduledAt} />
      </AppQueryProvider>
    </NextIntlClientProvider>,
  );
}

describe("DeleteAccountSection", () => {
  it("shows a delete button and confirm dialog when not scheduled for deletion", async () => {
    renderDeleteAccountSection(null);
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("button", { name: "Confirm deletion" })).toBeInTheDocument();
  });

  it("schedules deletion and shows the scheduled date with a cancel button", async () => {
    renderDeleteAccountSection(null);
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    expect(await screen.findByText(/scheduled for deletion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeInTheDocument();
  });

  it("shows scheduled state directly when deletionScheduledAt is set", () => {
    renderDeleteAccountSection("2026-08-18T00:00:00Z");
    expect(screen.getByText(/scheduled for deletion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeInTheDocument();
  });

  it("cancels a scheduled deletion", async () => {
    renderDeleteAccountSection("2026-08-18T00:00:00Z");
    await userEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));
    expect(await screen.findByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });
});
