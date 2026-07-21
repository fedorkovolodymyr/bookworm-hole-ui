import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LendDialog } from "./lend-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof LendDialog> = {
  title: "Statuses/LendDialog",
  component: LendDialog,
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

export const Default: StoryObj<typeof LendDialog> = {
  args: { statusId: "s1", open: true, onOpenChange: () => {} },
};
