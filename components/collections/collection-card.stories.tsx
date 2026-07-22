import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { CollectionCard } from "./collection-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CollectionCard> = {
  title: "Collections/CollectionCard",
  component: CollectionCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-xs">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseCollection = {
  id: "c1",
  user_id: "u1",
  name: "Favorites",
  description: "My favorite reads of all time.",
  is_public: true,
  cover_image_url: null,
  sort_order: 0,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Default: StoryObj<typeof CollectionCard> = { args: { collection: baseCollection } };
export const Private: StoryObj<typeof CollectionCard> = {
  args: { collection: { ...baseCollection, is_public: false } },
};
export const NoDescription: StoryObj<typeof CollectionCard> = {
  args: { collection: { ...baseCollection, description: null } },
};
