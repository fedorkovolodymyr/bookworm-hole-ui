import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { BookCard } from "./book-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof BookCard> = {
  title: "Catalog/BookCard",
  component: BookCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-xs">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseBook = {
  id: "b1",
  title: "Dune",
  original_title: null,
  original_language: null,
  first_publication_year: 1965,
  description: "A sci-fi epic about politics, religion, and ecology on a desert planet.",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Default: StoryObj<typeof BookCard> = { args: { book: baseBook } };

export const NoDescription: StoryObj<typeof BookCard> = {
  args: { book: { ...baseBook, description: "" } },
};

export const NoPublicationYear: StoryObj<typeof BookCard> = {
  args: { book: { ...baseBook, first_publication_year: null } },
};
