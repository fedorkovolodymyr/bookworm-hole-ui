import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";
import { ThemeProvider } from "@/lib/theme-provider";

describe("Header", () => {
  it("renders the logo link", () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );
    expect(screen.getByText("Bookworm Hole")).toBeInTheDocument();
  });

  it("renders a static Sign in button", () => {
    render(
      <ThemeProvider>
        <Header />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });
});
