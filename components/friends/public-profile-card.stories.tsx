import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PublicProfileCard } from "./public-profile-card";

const meta: Meta<typeof PublicProfileCard> = {
  title: "Friends/PublicProfileCard",
  component: PublicProfileCard,
};
export default meta;

type Story = StoryObj<typeof PublicProfileCard>;

const profile = {
  username: "bob",
  display_name: "Bob Reader",
  bio: "I read a lot.",
  avatar_url: null,
  collections: { items: [], total: 0, limit: 20, offset: 0 },
};

export const Default: Story = {
  args: { profile },
};

export const WithAction: Story = {
  args: { profile, action: <button>Send friend request</button> },
};
