import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SessionHistoryList } from "./session-history-list";

const meta: Meta<typeof SessionHistoryList> = {
  title: "Reading/SessionHistoryList",
  component: SessionHistoryList,
};
export default meta;

type Story = StoryObj<typeof SessionHistoryList>;

export const Empty: Story = {
  args: { sessions: [], onEdit: () => {}, onDelete: () => {} },
};

export const Populated: Story = {
  args: {
    sessions: [
      {
        id: "s1",
        user_id: "u1",
        release_id: "The Library of Babel",
        started_at: "2026-07-22T09:00:00Z",
        ended_at: "2026-07-22T10:00:00Z",
        position_start: 1,
        position_end: 20,
        position_unit: "page",
        pages_read: 19,
        notes: null,
        created_at: "2026-07-22T09:00:00Z",
        updated_at: "2026-07-22T10:00:00Z",
      },
    ],
    onEdit: () => {},
    onDelete: () => {},
  },
};
