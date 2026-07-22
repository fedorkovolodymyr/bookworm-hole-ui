import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddToCollectionDialog } from "./add-to-collection-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof AddToCollectionDialog> = {
  title: "Collections/AddToCollectionDialog",
  component: AddToCollectionDialog,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <Story />
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Default: StoryObj<typeof AddToCollectionDialog> = { args: { bookId: "b1" } };
