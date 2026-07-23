import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "./message-bubble";

const message = {
  id: "m1",
  thread_id: "t1",
  sender_id: "u1",
  body: "hello",
  attachment_book_id: null,
  attachment_collection_id: null,
  read_at: null,
  created_at: "x",
};

describe("MessageBubble", () => {
  it("renders the message body", () => {
    render(<MessageBubble message={message} isOwn={true} />);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("applies own-message styling when isOwn is true", () => {
    render(<MessageBubble message={message} isOwn={true} />);
    expect(screen.getByText("hello")).toHaveClass("bg-primary");
  });

  it("applies other-message styling when isOwn is false", () => {
    render(<MessageBubble message={message} isOwn={false} />);
    expect(screen.getByText("hello")).toHaveClass("bg-muted");
  });
});
