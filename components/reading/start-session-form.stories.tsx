import type { Meta, StoryObj } from "@storybook/react";
import { StartSessionForm } from "./start-session-form";

const meta: Meta<typeof StartSessionForm> = {
  title: "Reading/StartSessionForm",
  component: StartSessionForm,
};
export default meta;

type Story = StoryObj<typeof StartSessionForm>;

export const PreselectedRelease: Story = {
  args: { releaseId: "r1", onSuccess: () => {} },
};
