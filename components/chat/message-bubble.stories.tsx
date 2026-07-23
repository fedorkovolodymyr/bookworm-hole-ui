import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MessageBubble } from "./message-bubble";

const message = {
  id: "m1",
  thread_id: "t1",
  sender_id: "u1",
  body: "Have you finished the last chapter yet?",
  attachment_book_id: null,
  attachment_collection_id: null,
  read_at: null,
  created_at: "x",
};

const meta: Meta<typeof MessageBubble> = {
  title: "Chat/MessageBubble",
  component: MessageBubble,
  args: { message },
};
export default meta;
type Story = StoryObj<typeof MessageBubble>;

export const Own: Story = { args: { isOwn: true } };
export const Other: Story = { args: { isOwn: false } };
