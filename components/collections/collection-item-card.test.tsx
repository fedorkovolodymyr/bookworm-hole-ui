// components/collections/collection-item-card.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { CollectionItemCard } from "./collection-item-card";
import enMessages from "@/messages/en.json";
import type { CollectionItemResponse } from "@/lib/api/types";

const item: CollectionItemResponse = {
  id: "i1",
  collection_id: "c1",
  book_id: "b1",
  release_id: null,
  position: 0,
  added_at: "2020-01-01T00:00:00Z",
  note: "Great read",
};

function renderItem(props: Partial<React.ComponentProps<typeof CollectionItemCard>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <CollectionItemCard
        item={item}
        isFirst={false}
        isLast={false}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

describe("CollectionItemCard", () => {
  it("renders the note", () => {
    renderItem();
    expect(screen.getByText("Great read")).toBeInTheDocument();
  });

  it("disables move up when isFirst", () => {
    renderItem({ isFirst: true });
    expect(screen.getByRole("button", { name: /move up/i })).toBeDisabled();
  });

  it("disables move down when isLast", () => {
    renderItem({ isLast: true });
    expect(screen.getByRole("button", { name: /move down/i })).toBeDisabled();
  });

  it("calls onRemove when remove is clicked", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderItem({ onRemove });
    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("calls onMoveUp/onMoveDown", async () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    const user = userEvent.setup();
    renderItem({ onMoveUp, onMoveDown });
    await user.click(screen.getByRole("button", { name: /move up/i }));
    await user.click(screen.getByRole("button", { name: /move down/i }));
    expect(onMoveUp).toHaveBeenCalled();
    expect(onMoveDown).toHaveBeenCalled();
  });
});
