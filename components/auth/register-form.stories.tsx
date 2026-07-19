import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { RegisterForm } from "./register-form";

const meta: Meta<typeof RegisterForm> = {
  title: "Auth/RegisterForm",
  component: RegisterForm,
  decorators: [
    (Story) => (
      <AppQueryProvider>
        <Story />
      </AppQueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RegisterForm>;

export const Default: Story = {
  args: { onSuccess: () => {} },
};
