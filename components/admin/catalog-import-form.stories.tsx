import type { Meta, StoryObj } from "@storybook/react";
import { CatalogImportForm } from "./catalog-import-form";

const meta: Meta<typeof CatalogImportForm> = {
  title: "Admin/CatalogImportForm",
  component: CatalogImportForm,
};
export default meta;

type Story = StoryObj<typeof CatalogImportForm>;

export const Default: Story = {
  args: { onStarted: () => {} },
};
