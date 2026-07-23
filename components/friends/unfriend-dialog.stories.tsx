import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UnfriendDialog } from "./unfriend-dialog";

const meta: Meta<typeof UnfriendDialog> = {
  title: "Friends/UnfriendDialog",
  component: UnfriendDialog,
};
export default meta;

type Story = StoryObj<typeof UnfriendDialog>;

export const Open: Story = {
  args: { userId: "u1", open: true, onOpenChange: () => {} },
};
