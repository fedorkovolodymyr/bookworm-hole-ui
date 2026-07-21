import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { StatusListItem } from "./status-list-item";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof StatusListItem> = {
  title: "Statuses/StatusListItem",
  component: StatusListItem,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-md">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseStatus = {
  id: "s1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  status: "owned" as const,
  acquired_at: "2020-01-01T00:00:00Z",
  notes: null,
  lent_to_user_id: null,
  lent_to_name: null,
  lent_at: null,
  returned_at: null,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Owned: StoryObj<typeof StatusListItem> = {
  args: { status: baseStatus, onChangeStatus: () => {}, onLend: () => {}, onReturn: () => {} },
};
export const LentOut: StoryObj<typeof StatusListItem> = {
  args: {
    status: { ...baseStatus, status: "lent_out", lent_to_name: "Alex" },
    onChangeStatus: () => {},
    onLend: () => {},
    onReturn: () => {},
  },
};
