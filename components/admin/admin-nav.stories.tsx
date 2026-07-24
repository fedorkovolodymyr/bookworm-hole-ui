import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { AdminNav } from "./admin-nav";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof AdminNav> = {
  title: "Admin/AdminNav",
  component: AdminNav,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AdminNav>;

export const Default: Story = {};
