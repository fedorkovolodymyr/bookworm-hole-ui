import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { BookSearchFilters } from "./book-search-filters";
import enMessages from "@/messages/en.json";
import type { BookListParams } from "@/lib/api/types";

const meta: Meta<typeof BookSearchFilters> = {
  title: "Catalog/BookSearchFilters",
  component: BookSearchFilters,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

function Interactive() {
  const [value, setValue] = useState<BookListParams>({});
  return <BookSearchFilters value={value} onChange={setValue} />;
}

export const Default: StoryObj<typeof BookSearchFilters> = { render: () => <Interactive /> };
