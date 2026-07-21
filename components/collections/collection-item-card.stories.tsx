import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { CollectionItemCard } from "./collection-item-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof CollectionItemCard> = {
  title: "Collections/CollectionItemCard",
  component: CollectionItemCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-sm">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseItem = {
  id: "i1",
  collection_id: "c1",
  book_id: "b1",
  release_id: null,
  position: 0,
  added_at: "2020-01-01T00:00:00Z",
  note: "Great read",
};

export const Default: StoryObj<typeof CollectionItemCard> = {
  args: {
    item: baseItem,
    isFirst: false,
    isLast: false,
    onMoveUp: () => {},
    onMoveDown: () => {},
    onRemove: () => {},
  },
};
export const FirstItem: StoryObj<typeof CollectionItemCard> = {
  args: { ...Default.args, isFirst: true },
};
export const LastItem: StoryObj<typeof CollectionItemCard> = {
  args: { ...Default.args, isLast: true },
};
