import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReadingStreakBadge } from "./reading-streak-badge";

const meta: Meta<typeof ReadingStreakBadge> = {
  title: "Reading/ReadingStreakBadge",
  component: ReadingStreakBadge,
};
export default meta;

type Story = StoryObj<typeof ReadingStreakBadge>;

export const Default: Story = {};
