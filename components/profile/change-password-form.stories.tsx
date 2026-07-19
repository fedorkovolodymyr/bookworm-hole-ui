import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { ChangePasswordForm } from "./change-password-form";

const meta: Meta<typeof ChangePasswordForm> = {
  title: "Profile/ChangePasswordForm",
  component: ChangePasswordForm,
  decorators: [
    (Story) => (
      <AppQueryProvider>
        <Story />
      </AppQueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChangePasswordForm>;

export const Default: Story = {};
