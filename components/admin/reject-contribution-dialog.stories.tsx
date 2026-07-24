import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { RejectContributionDialog } from "./reject-contribution-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof RejectContributionDialog> = {
  title: "Admin/RejectContributionDialog",
  component: RejectContributionDialog,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof RejectContributionDialog>;

export const Open: Story = {
  args: { contributionId: "c1", open: true, onOpenChange: () => {} },
};
