import type { Meta, StoryObj } from "@storybook/react";
import { CatalogImportStatus } from "./catalog-import-status";

const meta: Meta<typeof CatalogImportStatus> = {
  title: "Admin/CatalogImportStatus",
  component: CatalogImportStatus,
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
