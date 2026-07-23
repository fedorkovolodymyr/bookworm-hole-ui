import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FindUserForm } from "./find-user-form";

const meta: Meta<typeof FindUserForm> = {
  title: "Friends/FindUserForm",
  component: FindUserForm,
};
export default meta;

type Story = StoryObj<typeof FindUserForm>;

export const Default: Story = {};
