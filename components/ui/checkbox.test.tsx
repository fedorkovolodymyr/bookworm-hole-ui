import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders unchecked by default", () => {
    render(<Checkbox />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("toggles when clicked", async () => {
    render(<Checkbox />);
    const checkbox = screen.getByRole("checkbox");
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("is disabled when disabled prop set", () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
  });
});
