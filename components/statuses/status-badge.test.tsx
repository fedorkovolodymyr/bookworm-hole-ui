import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { StatusBadge } from "./status-badge";
import enMessages from "@/messages/en.json";

describe("StatusBadge", () => {
  it("renders the localized label for a status kind", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <StatusBadge status="lent_out" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Lent out")).toBeInTheDocument();
  });
});
