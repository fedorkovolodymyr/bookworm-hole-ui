import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SessionHistoryItem } from "./session-history-item";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: "2026-07-22T10:00:00Z",
  position_start: 1,
  position_end: 20,
  position_unit: "page",
  pages_read: 19,
  notes: "Good chapter",
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T10:00:00Z",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SessionHistoryItem", () => {
  it("shows release, pages read, and notes", () => {
    renderWithIntl(<SessionHistoryItem session={session} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("r1")).toBeInTheDocument();
    expect(screen.getByText("Good chapter")).toBeInTheDocument();
  });

  it("calls onEdit and onDelete", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderWithIntl(<SessionHistoryItem session={session} onEdit={onEdit} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
