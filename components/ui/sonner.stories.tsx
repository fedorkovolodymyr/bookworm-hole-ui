import type { Meta, StoryObj } from "@storybook/react";
import { toast } from "sonner";
import { Toaster } from "./sonner";
import { Button } from "./button";

const meta: Meta<typeof Toaster> = {
  title: "UI/Toast",
  component: Toaster,
};
export default meta;
type Story = StoryObj<typeof Toaster>;

export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast("Book added to collection")}>Show Toast</Button>
    </div>
  ),
};

export const ErrorToast: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast.error("Failed to save review")}>Show Error Toast</Button>
    </div>
  ),
};
