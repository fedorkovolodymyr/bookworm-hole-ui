import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import { BookSearchFilters } from "./book-search-filters";
import enMessages from "@/messages/en.json";
import type { BookListParams } from "@/lib/api/types";

function Wrapper() {
  const [value, setValue] = useState<BookListParams>({});
  return <BookSearchFilters value={value} onChange={setValue} />;
}

function renderFilters() {
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <Wrapper />
    </NextIntlClientProvider>,
  );
}

describe("BookSearchFilters", () => {
  it("calls onChange with title when typed", async () => {
    const user = userEvent.setup();
    renderFilters();
    const titleInput = screen.getByLabelText("Title") as HTMLInputElement;
    await user.type(titleInput, "Dune");
    expect(titleInput.value).toBe("Dune");
  });

  it("calls onChange with author when typed", async () => {
    const user = userEvent.setup();
    renderFilters();
    const authorInput = screen.getByLabelText("Author") as HTMLInputElement;
    await user.type(authorInput, "Herbert");
    expect(authorInput.value).toBe("Herbert");
  });
});
