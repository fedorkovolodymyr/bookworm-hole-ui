import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppQueryProvider } from "@/lib/query-client";
import { Header } from "./header";

function renderHeader() {
  return render(
    <ThemeProvider>
      <AppQueryProvider>
        <Header />
      </AppQueryProvider>
    </ThemeProvider>,
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
    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
  });

  it("shows a user menu with the display name when a session exists", async () => {
    renderHeader();
    expect(await screen.findByRole("button", { name: /Alice/ })).toBeInTheDocument();
  });
});
