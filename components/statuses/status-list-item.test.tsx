import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { StatusListItem } from "./status-list-item";
import enMessages from "@/messages/en.json";
import type { BookStatusResponse } from "@/lib/api/types";

const baseStatus: BookStatusResponse = {
  id: "s1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  status: "owned",
  acquired_at: "2020-01-01T00:00:00Z",
  notes: null,
  lent_to_user_id: null,
  lent_to_name: null,
  lent_at: null,
  returned_at: null,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

function renderItem(props: Partial<React.ComponentProps<typeof StatusListItem>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <StatusListItem
        status={baseStatus}
        onChangeStatus={vi.fn()}
        onLend={vi.fn()}
        onReturn={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("StatusListItem", () => {
  it("shows a lend action for an owned book", () => {
    renderItem();
    expect(screen.getByRole("button", { name: /lend to/i })).toBeInTheDocument();
  });

  it("shows a return action for a lent-out book, not a lend action", () => {
    renderItem({ status: { ...baseStatus, status: "lent_out", lent_to_name: "Alex" } });
    expect(screen.getByRole("button", { name: /mark returned/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /lend to/i })).not.toBeInTheDocument();
  });

  it("calls onChangeStatus when change-status is clicked", async () => {
    const onChangeStatus = vi.fn();
    const user = userEvent.setup();
    renderItem({ onChangeStatus });
    await user.click(screen.getByRole("button", { name: /change status/i }));
    expect(onChangeStatus).toHaveBeenCalled();
  });
});
