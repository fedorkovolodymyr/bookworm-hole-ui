import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { AuditLogFilters } from "./audit-log-filters";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof AuditLogFilters> = {
  title: "Admin/AuditLogFilters",
  component: AuditLogFilters,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AuditLogFilters>;

export const Default: Story = {
  args: { value: {}, onChange: () => {} },
};
