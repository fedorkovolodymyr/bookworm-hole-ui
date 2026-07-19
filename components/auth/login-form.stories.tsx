import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { LoginForm } from "./login-form";

const meta: Meta<typeof LoginForm> = {
  title: "Auth/LoginForm",
  component: LoginForm,
  decorators: [
    (Story) => (
      <AppQueryProvider>
        <Story />
      </AppQueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: { onSuccess: () => {} },
};
