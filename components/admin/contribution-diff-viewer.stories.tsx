import type { Meta, StoryObj } from "@storybook/react";
import { ContributionDiffViewer } from "./contribution-diff-viewer";

const meta: Meta<typeof ContributionDiffViewer> = {
  title: "Admin/ContributionDiffViewer",
  component: ContributionDiffViewer,
};
export default meta;

type Story = StoryObj<typeof ContributionDiffViewer>;

export const ChangedFields: Story = {
  args: {
    diff: {
      proposed: { title: "New Title", pages: 300 },
      current: { title: "Old Title", pages: 250 },
      warnings: [],
    },
  },
};

export const NewEntity: Story = {
  args: {
    diff: { proposed: { title: "Brand New Book" }, current: null, warnings: ["Missing ISBN"] },
  },
};
