import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { StatusBadge } from "./status-badge";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof StatusBadge> = {
  title: "Statuses/StatusBadge",
  component: StatusBadge,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

export const Owned: StoryObj<typeof StatusBadge> = { args: { status: "owned" } };
export const Wishlist: StoryObj<typeof StatusBadge> = { args: { status: "wishlist" } };
export const LentOut: StoryObj<typeof StatusBadge> = { args: { status: "lent_out" } };
export const Borrowed: StoryObj<typeof StatusBadge> = { args: { status: "borrowed" } };
