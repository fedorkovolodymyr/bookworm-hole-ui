import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MergeBooksDialog } from "./merge-books-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof MergeBooksDialog> = {
  title: "Catalog/Admin/MergeBooksDialog",
  component: MergeBooksDialog,
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

export const Default: StoryObj<typeof MergeBooksDialog> = {
  args: { sourceBookId: "b1", sourceBookTitle: "Dune", onSuccess: () => {} },
};
