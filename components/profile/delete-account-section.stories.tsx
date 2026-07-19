import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { DeleteAccountSection } from "./delete-account-section";

const meta: Meta<typeof DeleteAccountSection> = {
  title: "Profile/DeleteAccountSection",
  component: DeleteAccountSection,
  decorators: [
    (Story) => (
      <AppQueryProvider>
        <Story />
      </AppQueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DeleteAccountSection>;

export const NotScheduled: Story = {
  args: { deletionScheduledAt: null },
};

export const Scheduled: Story = {
  args: { deletionScheduledAt: "2026-08-18T00:00:00Z" },
};
