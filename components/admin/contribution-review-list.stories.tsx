import type { Meta, StoryObj } from "@storybook/react";
import { ContributionReviewList } from "./contribution-review-list";

const meta: Meta<typeof ContributionReviewList> = {
  title: "Admin/ContributionReviewList",
  component: ContributionReviewList,
};
export default meta;

type Story = StoryObj<typeof ContributionReviewList>;

const contributions = [
  {
    id: "c1",
    user_id: "u1",
    kind: "book_create" as const,
    target_id: null,
    payload: {},
    status: "submitted" as const,
    reviewer_id: null,
    review_notes: null,
    created_at: "2026-07-24T10:00:00Z",
    updated_at: "2026-07-24T10:00:00Z",
    warnings: [],
  },
];

export const Default: Story = {
  args: { contributions, onSelect: () => {} },
};

export const Empty: Story = {
  args: { contributions: [], onSelect: () => {} },
};
