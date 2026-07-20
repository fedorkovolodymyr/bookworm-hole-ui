import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";
import enMessages from "@/messages/en.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AppShell", () => {
  it("renders header and children", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ThemeProvider>
          <AppQueryProvider>
            <AppShell>
              <p>Test content</p>
            </AppShell>
          </AppQueryProvider>
        </ThemeProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });
});
