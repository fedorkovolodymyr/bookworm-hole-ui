import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { AuditLogFilters } from "./audit-log-filters";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("AuditLogFilters", () => {
  it("calls onChange with the updated actor id", () => {
    const onChange = vi.fn();
    renderWithIntl(<AuditLogFilters value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Actor ID"), {
      target: { value: "u1" },
    });

    expect(onChange).toHaveBeenCalledWith({ actor_id: "u1" });
  });
});
