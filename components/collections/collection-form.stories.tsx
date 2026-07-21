import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CollectionForm } from "./collection-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CollectionForm> = {
  title: "Collections/CollectionForm",
  component: CollectionForm,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <div className="max-w-sm">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

export const Create: StoryObj<typeof CollectionForm> = { args: { onSuccess: () => {} } };
export const Edit: StoryObj<typeof CollectionForm> = {
  args: {
    onSuccess: () => {},
    collection: {
      id: "c1",
      user_id: "u1",
      name: "Favorites",
      description: "My favorite reads",
      is_public: true,
      cover_image_url: null,
      sort_order: 0,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  },
};
