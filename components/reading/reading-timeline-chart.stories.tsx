import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReadingTimelineChart } from "./reading-timeline-chart";

const meta: Meta<typeof ReadingTimelineChart> = {
  title: "Reading/ReadingTimelineChart",
  component: ReadingTimelineChart,
};
export default meta;

type Story = StoryObj<typeof ReadingTimelineChart>;

export const Default: Story = {
  args: { fromDate: "2026-07-01", toDate: "2026-07-22" },
};
