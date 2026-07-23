import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { SessionHistoryList } from "./session-history-list";
import type { ReadingSessionResponse } from "@/lib/api/types";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("SessionHistoryList", () => {
  it("shows the empty state when there are no sessions", () => {
    renderWithIntl(<SessionHistoryList sessions={[]} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("No reading sessions yet.")).toBeInTheDocument();
  });

  it("renders one item per session", () => {
    const sessions: ReadingSessionResponse[] = [
      {
        id: "s1",
        user_id: "u1",
        release_id: "r1",
        started_at: "2026-07-22T09:00:00Z",
        ended_at: "2026-07-22T10:00:00Z",
        position_start: null,
        position_end: null,
        position_unit: null,
        pages_read: 10,
        notes: null,
        created_at: "2026-07-22T09:00:00Z",
        updated_at: "2026-07-22T10:00:00Z",
      },
    ];
    renderWithIntl(
      <SessionHistoryList sessions={sessions} onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("r1")).toBeInTheDocument();
  });
});
