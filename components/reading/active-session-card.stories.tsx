import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ActiveSessionCard } from "./active-session-card";

const meta: Meta<typeof ActiveSessionCard> = {
  title: "Reading/ActiveSessionCard",
  component: ActiveSessionCard,
};
export default meta;

type Story = StoryObj<typeof ActiveSessionCard>;

export const Default: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "The Library of Babel",
      started_at: new Date().toISOString(),
      ended_at: null,
      position_start: 10,
      position_end: null,
      position_unit: "page",
      pages_read: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    onStop: () => {},
  },
};
