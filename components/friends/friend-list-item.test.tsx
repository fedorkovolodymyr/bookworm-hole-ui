import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/en.json";
import { FriendListItem } from "./friend-list-item";
import type { FriendResponse } from "@/lib/api/types";

const friend: FriendResponse = {
  user_id: "u1",
  username: "bob",
  display_name: "Bob",
  avatar_url: null,
  since: "2026-01-01T00:00:00Z",
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FriendListItem", () => {
  it("shows the friend's display name and username", () => {
    renderWithIntl(<FriendListItem friend={friend} onUnfriend={() => {}} onBlock={() => {}} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("calls onUnfriend and onBlock", async () => {
    const onUnfriend = vi.fn();
    const onBlock = vi.fn();
    renderWithIntl(<FriendListItem friend={friend} onUnfriend={onUnfriend} onBlock={onBlock} />);
    await userEvent.click(screen.getByRole("button", { name: "Unfriend" }));
    expect(onUnfriend).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole("button", { name: "Block" }));
    expect(onBlock).toHaveBeenCalledOnce();
  });
});
