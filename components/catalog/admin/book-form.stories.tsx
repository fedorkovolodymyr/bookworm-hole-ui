import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookForm } from "./book-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof BookForm> = {
  title: "Catalog/Admin/BookForm",
  component: BookForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <div className="max-w-md">
            <Story />
          </div>
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Create: StoryObj<typeof BookForm> = { args: { onSuccess: () => {} } };

export const Edit: StoryObj<typeof BookForm> = {
  args: {
    book: {
      id: "b1",
      title: "Dune",
      original_title: null,
      original_language: null,
      first_publication_year: 1965,
      description: "A sci-fi epic.",
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
    onSuccess: () => {},
  },
};
