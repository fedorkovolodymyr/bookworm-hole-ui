import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppQueryProvider } from "@/lib/query-client";
import { DeleteAccountSection } from "./delete-account-section";

describe("DeleteAccountSection", () => {
  it("shows a delete button and confirm dialog when not scheduled for deletion", async () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt={null} />
      </AppQueryProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    expect(screen.getByRole("button", { name: "Confirm deletion" })).toBeInTheDocument();
  });

  it("schedules deletion and shows the scheduled date with a cancel button", async () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt={null} />
      </AppQueryProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    expect(await screen.findByText(/scheduled for deletion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeInTheDocument();
  });

  it("shows scheduled state directly when deletionScheduledAt is set", () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt="2026-08-18T00:00:00Z" />
      </AppQueryProvider>,
    );
    expect(screen.getByText(/scheduled for deletion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel deletion" })).toBeInTheDocument();
  });

  it("cancels a scheduled deletion", async () => {
    render(
      <AppQueryProvider>
        <DeleteAccountSection deletionScheduledAt="2026-08-18T00:00:00Z" />
      </AppQueryProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));
    expect(await screen.findByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });
});
