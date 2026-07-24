import type { Meta, StoryObj } from "@storybook/react";
import { PasswordResetDialog } from "./password-reset-dialog";

const meta: Meta<typeof PasswordResetDialog> = {
  title: "Admin/PasswordResetDialog",
  component: PasswordResetDialog,
};
export default meta;

type Story = StoryObj<typeof PasswordResetDialog>;

export const Open: Story = {
  args: { userId: "u1", open: true, onOpenChange: () => {} },
};
