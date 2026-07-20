import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReleaseForm } from "./release-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReleaseForm> = {
  title: "Catalog/Admin/ReleaseForm",
  component: ReleaseForm,
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

export const Create: StoryObj<typeof ReleaseForm> = {
  args: { bookId: "b1", onSuccess: () => {} },
};
