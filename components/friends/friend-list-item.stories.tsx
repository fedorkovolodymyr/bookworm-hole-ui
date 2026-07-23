import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FriendListItem } from "./friend-list-item";

const meta: Meta<typeof FriendListItem> = {
  title: "Friends/FriendListItem",
  component: FriendListItem,
};
export default meta;

type Story = StoryObj<typeof FriendListItem>;

export const Default: Story = {
  args: {
    friend: {
      user_id: "u1",
      username: "bob",
      display_name: "Bob Reader",
      avatar_url: null,
      since: new Date().toISOString(),
    },
    onUnfriend: () => {},
    onBlock: () => {},
  },
};
