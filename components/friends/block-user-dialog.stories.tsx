import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BlockUserDialog } from "./block-user-dialog";

const meta: Meta<typeof BlockUserDialog> = {
  title: "Friends/BlockUserDialog",
  component: BlockUserDialog,
};
export default meta;

type Story = StoryObj<typeof BlockUserDialog>;

export const Open: Story = {
  args: { userId: "u1", open: true, onOpenChange: () => {} },
};
