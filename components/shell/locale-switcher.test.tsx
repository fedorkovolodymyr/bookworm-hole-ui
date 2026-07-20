import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";
import enMessages from "@/messages/en.json";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  it("renders a trigger button", () => {
    renderSwitcher();
    expect(screen.getByRole("button", { name: /language/i })).toBeInTheDocument();
  });

  it("switches locale and refreshes on selecting Ukrainian", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("button", { name: /language/i }));
    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /ukrainian/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("menuitem", { name: /ukrainian/i }));
    expect(document.cookie).toContain("NEXT_LOCALE=uk");
    expect(refreshMock).toHaveBeenCalled();
  });
});
