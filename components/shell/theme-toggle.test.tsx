import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeToggle } from "./theme-toggle";
import { ThemeProvider } from "@/lib/theme-provider";

describe("ThemeToggle", () => {
  it("renders a toggle button after mount", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Toggle theme" })).toBeEnabled();
    });
  });
});
