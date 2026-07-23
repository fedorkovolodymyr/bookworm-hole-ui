import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ThreadListItem } from "./thread-list-item";

const friend = { user_id: "u2", username: "bee", display_name: "Bee", avatar_url: null, since: "x" };
const baseThread = {
  id: "t1",
  user_a_id: "u1",
  user_b_id: "u2",
  last_message_at: "2026-01-01T00:00:00Z",
  created_at: "x",
};

const meta: Meta<typeof ThreadListItem> = {
  title: "Chat/ThreadListItem",
  component: ThreadListItem,
  args: { currentUserId: "u1", onClick: () => {} },
};
export default meta;
type Story = StoryObj<typeof ThreadListItem>;

export const Unread: Story = {
  args: {
    friend,
    thread: {
      ...baseThread,
      last_message: {
        id: "m1",
        thread_id: "t1",
        sender_id: "u2",
        body: "Hey, how's the book?",
        attachment_book_id: null,
        attachment_collection_id: null,
        read_at: null,
        created_at: "x",
      },
    },
  },
};

export const Read: Story = {
  args: {
    friend,
    thread: {
      ...baseThread,
      last_message: {
        id: "m1",
        thread_id: "t1",
        sender_id: "u1",
        body: "Loved it!",
        attachment_book_id: null,
        attachment_collection_id: null,
        read_at: "2026-01-01T00:05:00Z",
        created_at: "x",
      },
    },
  },
};

export const Empty: Story = {
  args: { friend, thread: { ...baseThread, last_message: null } },
};
