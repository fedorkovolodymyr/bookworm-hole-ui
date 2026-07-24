import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { CatalogImportStatus } from "./catalog-import-status";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CatalogImportStatus> = {
  title: "Admin/CatalogImportStatus",
  component: CatalogImportStatus,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CatalogImportStatus>;

export const Pending: Story = {
  args: { status: { job_id: "job1", status: "pending" } },
};

export const Completed: Story = {
  args: {
    status: { job_id: "job1", status: "completed", result: { imported: 12 } },
  },
};
