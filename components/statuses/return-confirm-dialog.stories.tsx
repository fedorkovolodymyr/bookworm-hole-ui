import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReturnConfirmDialog } from "./return-confirm-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReturnConfirmDialog> = {
  title: "Statuses/ReturnConfirmDialog",
  component: ReturnConfirmDialog,
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

export const Default: StoryObj<typeof ReturnConfirmDialog> = {
  args: { statusId: "s1", open: true, onOpenChange: () => {} },
};
