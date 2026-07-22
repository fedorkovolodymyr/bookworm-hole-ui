import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ShareDialog } from "./share-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ShareDialog> = {
  title: "Share/ShareDialog",
  component: ShareDialog,
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

export const ShareBook: StoryObj<typeof ShareDialog> = { args: { kind: "book", targetId: "b1" } };
export const ShareCollection: StoryObj<typeof ShareDialog> = {
  args: { kind: "collection", targetId: "c1" },
};
