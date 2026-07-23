import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EditSessionForm } from "./edit-session-form";

const meta: Meta<typeof EditSessionForm> = {
  title: "Reading/EditSessionForm",
  component: EditSessionForm,
};
export default meta;

type Story = StoryObj<typeof EditSessionForm>;

export const Default: Story = {
  args: {
    session: {
      id: "s1",
      user_id: "u1",
      release_id: "r1",
      started_at: "2026-07-22T09:00:00Z",
      ended_at: "2026-07-22T10:00:00Z",
      position_start: 1,
      position_end: 20,
      position_unit: "page",
      pages_read: 19,
      notes: "Great chapter",
      created_at: "2026-07-22T09:00:00Z",
      updated_at: "2026-07-22T10:00:00Z",
    },
    onSuccess: () => {},
  },
};
