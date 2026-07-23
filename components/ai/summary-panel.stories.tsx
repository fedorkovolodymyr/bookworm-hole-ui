import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SummaryPanel } from "./summary-panel";

const meta: Meta<typeof SummaryPanel> = {
  title: "AI/SummaryPanel",
  component: SummaryPanel,
};
export default meta;
type Story = StoryObj<typeof SummaryPanel>;

export const Default: Story = {};
