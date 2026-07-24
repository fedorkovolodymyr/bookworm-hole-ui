import type { Meta, StoryObj } from "@storybook/react";
import { UserTable } from "./user-table";

const meta: Meta<typeof UserTable> = {
  title: "Admin/UserTable",
  component: UserTable,
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
