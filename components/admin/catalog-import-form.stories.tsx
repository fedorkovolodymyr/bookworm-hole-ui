import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { CatalogImportForm } from "./catalog-import-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CatalogImportForm> = {
  title: "Admin/CatalogImportForm",
  component: CatalogImportForm,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CatalogImportForm>;

export const Default: Story = {
  args: { onStarted: () => {} },
};
