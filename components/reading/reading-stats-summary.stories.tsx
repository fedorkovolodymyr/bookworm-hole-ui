import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReadingStatsSummary } from "./reading-stats-summary";

const meta: Meta<typeof ReadingStatsSummary> = {
  title: "Reading/ReadingStatsSummary",
  component: ReadingStatsSummary,
};
export default meta;

type Story = StoryObj<typeof ReadingStatsSummary>;

export const Default: Story = {
  args: { period: "month" },
};
