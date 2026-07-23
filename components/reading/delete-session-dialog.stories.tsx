import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DeleteSessionDialog } from "./delete-session-dialog";

const meta: Meta<typeof DeleteSessionDialog> = {
  title: "Reading/DeleteSessionDialog",
  component: DeleteSessionDialog,
};
export default meta;

type Story = StoryObj<typeof DeleteSessionDialog>;

export const Open: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "r1",
      started_at: "2026-07-22T09:00:00Z",
      ended_at: null,
      position_start: null,
      position_end: null,
      position_unit: null,
      pages_read: null,
      notes: null,
      created_at: "2026-07-22T09:00:00Z",
      updated_at: "2026-07-22T09:00:00Z",
    },
    open: true,
    onOpenChange: () => {},
  },
};
