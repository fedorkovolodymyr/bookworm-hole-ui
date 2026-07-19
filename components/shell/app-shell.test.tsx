import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";

describe("AppShell", () => {
  it("renders header and children", () => {
    render(
      <ThemeProvider>
        <AppQueryProvider>
          <AppShell>
            <p>Test content</p>
          </AppShell>
        </AppQueryProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});
