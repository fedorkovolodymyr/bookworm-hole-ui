import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("renders with placeholder", () => {
    render(<Input placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
  });

  it("accepts typed input", async () => {
    render(<Input placeholder="type here" />);
    const input = screen.getByPlaceholderText("type here");
    await userEvent.type(input, "hello");
    expect(input).toHaveValue("hello");
  });

  it("is disabled when disabled prop set", () => {
    render(<Input placeholder="disabled" disabled />);
    expect(screen.getByPlaceholderText("disabled")).toBeDisabled();
  });
});
