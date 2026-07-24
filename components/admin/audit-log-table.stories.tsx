import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { AuditLogTable } from "./audit-log-table";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof AuditLogTable> = {
  title: "Admin/AuditLogTable",
  component: AuditLogTable,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof AuditLogTable>;

const logs = [
  {
    id: "l1",
    actor_id: "u1",
    action: "promote_user" as const,
    target_type: "user" as const,
    target_id: "u2",
    audit_metadata: {},
    ip_address: "127.0.0.1",
    created_at: "2026-07-24T10:00:00Z",
  },
];

export const Default: Story = {
  args: { logs },
};

export const Empty: Story = {
  args: { logs: [] },
};
