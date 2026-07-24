import type { Meta, StoryObj } from "@storybook/react";
import { RejectContributionDialog } from "./reject-contribution-dialog";

const meta: Meta<typeof RejectContributionDialog> = {
  title: "Admin/RejectContributionDialog",
  component: RejectContributionDialog,
};
export default meta;

type Story = StoryObj<typeof RejectContributionDialog>;

export const Open: Story = {
  args: { contributionId: "c1", open: true, onOpenChange: () => {} },
};
