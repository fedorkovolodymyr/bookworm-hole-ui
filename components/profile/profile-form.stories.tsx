import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { ProfileForm } from "./profile-form";

const meta: Meta<typeof ProfileForm> = {
  title: "Profile/ProfileForm",
  component: ProfileForm,
  decorators: [
    (Story) => (
      <AppQueryProvider>
        <Story />
      </AppQueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileForm>;

export const Default: Story = {
  args: {
    profile: {
      id: "1",
      email: "a@b.com",
      username: "alice",
      display_name: "Alice",
      bio: "Book lover.",
      avatar_url: null,
      locale: "en",
      timezone: "UTC",
      is_active: true,
      is_admin: false,
      deletion_scheduled_at: null,
    },
  },
};
