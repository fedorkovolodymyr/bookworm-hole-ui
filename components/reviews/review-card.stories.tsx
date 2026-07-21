import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewCard } from "./review-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewCard> = {
  title: "Reviews/ReviewCard",
  component: ReviewCard,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      return (
        <QueryClientProvider client={queryClient}>
          <NextIntlClientProvider locale="en" messages={enMessages}>
            <div className="max-w-md">
              <Story />
            </div>
          </NextIntlClientProvider>
        </QueryClientProvider>
      );
    },
  ],
};
export default meta;

const baseReview = {
  id: "r1",
  user_id: "u1",
  book_id: "b1",
  release_id: null,
  rating: 5,
  title: "Loved it",
  body: "A great read from start to finish.",
  is_public: true,
  contains_spoilers: false,
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const AsViewer: StoryObj<typeof ReviewCard> = { args: { review: baseReview, onEdit: () => {} } };
export const AsAuthor: StoryObj<typeof ReviewCard> = {
  args: { review: baseReview, currentUserId: "u1", onEdit: () => {} },
};
export const WithSpoilerWarning: StoryObj<typeof ReviewCard> = {
  args: { review: { ...baseReview, contains_spoilers: true }, onEdit: () => {} },
};
