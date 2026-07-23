import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FriendRequestCard } from "./friend-request-card";

const meta: Meta<typeof FriendRequestCard> = {
  title: "Friends/FriendRequestCard",
  component: FriendRequestCard,
};
export default meta;

type Story = StoryObj<typeof FriendRequestCard>;

const request = {
  id: "f1",
  requester_id: "u1",
  addressee_id: "u2",
  status: "pending" as const,
  created_at: new Date().toISOString(),
  responded_at: null,
};

export const Incoming: Story = {
  args: {
    request,
    direction: "incoming",
    requesterLabel: "bob",
    onAccept: () => {},
    onDecline: () => {},
  },
};

export const Outgoing: Story = {
  args: { request, direction: "outgoing", requesterLabel: "carol" },
};
