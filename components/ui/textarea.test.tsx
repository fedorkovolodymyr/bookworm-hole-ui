import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders with placeholder", () => {
    render(<Textarea placeholder="Type your message..." />);
    expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    render(<Textarea placeholder="type here" />);
    const textarea = screen.getByPlaceholderText("type here");
    await userEvent.type(textarea, "hello world");
    expect(textarea).toHaveValue("hello world");
  });
});
