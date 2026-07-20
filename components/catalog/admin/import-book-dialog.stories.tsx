import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImportBookDialog } from "./import-book-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ImportBookDialog> = {
  title: "Catalog/Admin/ImportBookDialog",
  component: ImportBookDialog,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Story />
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof ImportBookDialog> = {
  args: {
    hit: {
      source: "google_books",
      source_id: "zyTCAlFPjgYC",
      title: "Dune",
      isbns: ["9780441013593"],
      authors: ["Frank Herbert"],
      cover_image_url: null,
    },
  },
};
