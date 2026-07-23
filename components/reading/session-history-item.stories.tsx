import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionHistoryItem } from "./session-history-item";

const meta: Meta<typeof SessionHistoryItem> = {
  title: "Reading/SessionHistoryItem",
  component: SessionHistoryItem,
};
export default meta;

type Story = StoryObj<typeof SessionHistoryItem>;

export const Default: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "The Library of Babel",
      started_at: "2026-07-22T09:00:00Z",
      ended_at: "2026-07-22T10:00:00Z",
      position_start: 1,
      position_end: 20,
      position_unit: "page",
      pages_read: 19,
      notes: "Great chapter",
      created_at: "2026-07-22T09:00:00Z",
      updated_at: "2026-07-22T10:00:00Z",
    },
    onEdit: () => {},
    onDelete: () => {},
  },
};
