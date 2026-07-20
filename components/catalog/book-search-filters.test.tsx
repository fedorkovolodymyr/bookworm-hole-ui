import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { BookSearchFilters } from "./book-search-filters";
import enMessages from "@/messages/en.json";
import type { BookListParams } from "@/lib/api/types";

function renderFilters(value: BookListParams = {}, onChange = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <BookSearchFilters value={value} onChange={onChange} />
    </NextIntlClientProvider>,
  );
  return onChange;
}

describe("BookSearchFilters", () => {
  it("calls onChange with the full merged params object when title changes", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters({ author: "Herbert" });
    await user.type(screen.getByLabelText("Title"), "D");
    expect(onChange).toHaveBeenLastCalledWith({ author: "Herbert", title: "D" });
  });

  it("calls onChange with the full merged params object when author changes", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters({ title: "Dune" });
    await user.type(screen.getByLabelText("Author"), "H");
    expect(onChange).toHaveBeenLastCalledWith({ title: "Dune", author: "H" });
  });

  it("preserves other fields when language changes", async () => {
    const user = userEvent.setup();
    const onChange = renderFilters({ title: "Dune", author: "Herbert" });
    await user.type(screen.getByLabelText("Language"), "e");
    expect(onChange).toHaveBeenLastCalledWith({ title: "Dune", author: "Herbert", language: "e" });
  });
});
