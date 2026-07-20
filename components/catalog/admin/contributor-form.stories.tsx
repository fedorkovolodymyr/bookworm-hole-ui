import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContributorForm } from "./contributor-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ContributorForm> = {
  title: "Catalog/Admin/ContributorForm",
  component: ContributorForm,
  decorators: [
    (Story) => (
      <QueryClientProvider client={new QueryClient()}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <div className="max-w-md">
            <Story />
          </div>
        </NextIntlClientProvider>
      </QueryClientProvider>
    ),
  ],
};
export default meta;

export const Create: StoryObj<typeof ContributorForm> = { args: { onSuccess: () => {} } };
