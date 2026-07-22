import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { ActiveSessionCard } from "./active-session-card";
import type { ReadingSessionResponse } from "@/lib/api/types";

const session: ReadingSessionResponse = {
  id: "s1",
  user_id: "u1",
  release_id: "r1",
  started_at: "2026-07-22T09:00:00Z",
  ended_at: null,
  position_start: 10,
  position_end: null,
  position_unit: "page",
  pages_read: null,
  notes: null,
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T09:00:00Z",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ActiveSessionCard", () => {
  it("shows the release id and a stop button", () => {
    renderWithIntl(<ActiveSessionCard session={session} onStop={() => {}} />);
    expect(screen.getByText("r1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("calls onStop when the stop button is clicked", async () => {
    const onStop = vi.fn();
    renderWithIntl(<ActiveSessionCard session={session} onStop={onStop} />);
    await userEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
