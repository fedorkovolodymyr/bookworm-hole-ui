import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { ThreadListItem } from "./thread-list-item";

const friend = { user_id: "u2", username: "bee", display_name: "Bee", avatar_url: null, since: "x" };
const thread = {
  id: "t1",
  user_a_id: "u1",
  user_b_id: "u2",
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "x",
  last_message: {
    id: "m1",
    thread_id: "t1",
    sender_id: "u2",
    body: "hello there",
    attachment_book_id: null,
    attachment_collection_id: null,
    read_at: null,
    created_at: "x",
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("ThreadListItem", () => {
  it("renders friend name and last message preview", () => {
    renderWithIntl(
      <ThreadListItem thread={thread} friend={friend} currentUserId="u1" onClick={() => {}} />,
    );
    expect(screen.getByText("Bee")).toBeInTheDocument();
    expect(screen.getByText("hello there")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    renderWithIntl(
      <ThreadListItem thread={thread} friend={friend} currentUserId="u1" onClick={onClick} />,
    );
    screen.getByRole("button").click();
    expect(onClick).toHaveBeenCalled();
  });

  it("shows unread indicator when last message is unread and not from me", () => {
    renderWithIntl(
      <ThreadListItem thread={thread} friend={friend} currentUserId="u1" onClick={() => {}} />,
    );
    expect(screen.getByLabelText("Unread")).toBeInTheDocument();
  });

  it("hides unread indicator when last message is from me", () => {
    const mine = { ...thread, last_message: { ...thread.last_message, sender_id: "u1" } };
    renderWithIntl(
      <ThreadListItem thread={mine} friend={friend} currentUserId="u1" onClick={() => {}} />,
    );
    expect(screen.queryByLabelText("Unread")).not.toBeInTheDocument();
  });
});
