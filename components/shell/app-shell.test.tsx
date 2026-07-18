import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/lib/theme-provider";

describe("AppShell", () => {
  it("renders header and children", () => {
    render(
      <ThemeProvider>
        <AppShell>
          <p>Test content</p>
        </AppShell>
      </ThemeProvider>,
    );
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});
