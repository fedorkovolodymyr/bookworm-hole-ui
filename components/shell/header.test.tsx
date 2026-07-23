import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";
import { Header } from "./header";
import enMessages from "@/messages/en.json";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderHeader() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ThemeProvider>
        <AppQueryProvider>
          <Header />
        </AppQueryProvider>
      </ThemeProvider>
    </NextIntlClientProvider>,
  );
}

describe("Header", () => {
  it("renders the logo link", () => {
    renderHeader();
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
  });

  it("shows a Sign in link when there is no session", async () => {
    const { server } = await import("@/tests/mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(http.get("/api/users/me", () => HttpResponse.json({}, { status: 401 })));

    renderHeader();
    // Base UI's Button forces role="button" with nativeButton={false} (see
    // components/ui/button.tsx), so the rendered <a href="/login"> is queried
    // by its button role rather than "link".
    const signIn = await screen.findByRole("button", { name: "Sign in" });
    expect(signIn).toBeInTheDocument();
    expect(signIn).toHaveAttribute("href", "/login");
  });

  it("shows a user menu with the display name when a session exists", async () => {
    renderHeader();
    expect(await screen.findByRole("button", { name: /Alice/ })).toBeInTheDocument();
  });

  it("renders nav links for Browse, Collections, and Reading", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: "Collections" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Reading" })).toHaveAttribute("href", "/reading");
  });
});
