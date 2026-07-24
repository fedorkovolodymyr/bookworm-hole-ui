import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AdminNav } from "./admin-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/users",
}));

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AdminNav", () => {
  it("renders all four tab links", () => {
    renderWithIntl(<AdminNav />);
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit logs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contributions" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Catalog imports" })).toBeInTheDocument();
  });
});
