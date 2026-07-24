import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { UserTable } from "./user-table";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof UserTable> = {
  title: "Admin/UserTable",
  component: UserTable,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof UserTable>;

const users = [
  {
    id: "u1",
    email: "alice@example.com",
    username: "alice",
    display_name: "Alice",
    is_active: true,
    is_admin: false,
  },
  {
    id: "u2",
    email: "bob@example.com",
    username: "bob",
    display_name: "Bob",
    is_active: false,
    is_admin: true,
  },
];

export const Default: Story = {
  args: { users, onResetPassword: () => {} },
};

export const Empty: Story = {
  args: { users: [], onResetPassword: () => {} },
};
