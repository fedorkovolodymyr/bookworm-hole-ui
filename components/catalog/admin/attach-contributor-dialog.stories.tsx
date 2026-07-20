import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AttachContributorDialog } from "./attach-contributor-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof AttachContributorDialog> = {
  title: "Catalog/Admin/AttachContributorDialog",
  component: AttachContributorDialog,
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

export const Default: StoryObj<typeof AttachContributorDialog> = {
  args: { bookId: "b1", onSuccess: () => {} },
};
