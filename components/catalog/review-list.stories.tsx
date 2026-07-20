import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewList> = {
  title: "Catalog/ReviewList",
  component: ReviewList,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const reviews = [
  {
    id: "rev1",
    user_id: "u1",
    book_id: "b1",
    release_id: null,
    rating: 5,
    title: "Loved it",
    body: "Great book.",
    is_public: true,
    contains_spoilers: false,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2020-01-01T00:00:00Z",
  },
];

export const Default: StoryObj<typeof ReviewList> = { args: { reviews, isLoading: false } };
export const Empty: StoryObj<typeof ReviewList> = { args: { reviews: [], isLoading: false } };
export const Loading: StoryObj<typeof ReviewList> = { args: { reviews: [], isLoading: true } };
