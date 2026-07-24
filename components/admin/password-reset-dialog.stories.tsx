import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { PasswordResetDialog } from "./password-reset-dialog";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof PasswordResetDialog> = {
  title: "Admin/PasswordResetDialog",
  component: PasswordResetDialog,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PasswordResetDialog>;

export const Open: Story = {
  args: { userId: "u1", open: true, onOpenChange: () => {} },
};
