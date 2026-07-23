import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RecommendationsPanel } from "./recommendations-panel";

const meta: Meta<typeof RecommendationsPanel> = {
  title: "AI/RecommendationsPanel",
  component: RecommendationsPanel,
};
export default meta;
type Story = StoryObj<typeof RecommendationsPanel>;

export const Default: Story = {};
