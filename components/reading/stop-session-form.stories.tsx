import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StopSessionForm } from "./stop-session-form";

const meta: Meta<typeof StopSessionForm> = {
  title: "Reading/StopSessionForm",
  component: StopSessionForm,
};
export default meta;

type Story = StoryObj<typeof StopSessionForm>;

export const Default: Story = {
  args: { releaseId: "r1", onSuccess: () => {} },
};
