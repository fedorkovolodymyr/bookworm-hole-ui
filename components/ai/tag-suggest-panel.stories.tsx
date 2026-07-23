import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TagSuggestPanel } from "./tag-suggest-panel";

const meta: Meta<typeof TagSuggestPanel> = {
  title: "AI/TagSuggestPanel",
  component: TagSuggestPanel,
  args: { bookId: "b1", bookLabel: "Dune" },
};
export default meta;
type Story = StoryObj<typeof TagSuggestPanel>;

export const Default: Story = {};
export const NoBookSelected: Story = { args: { bookId: null, bookLabel: null } };
