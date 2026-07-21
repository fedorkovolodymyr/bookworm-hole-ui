import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewList } from "./review-list";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewList> = {
  title: "Reviews/ReviewList",
  component: ReviewList,
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

export const Loading: StoryObj<typeof ReviewList> = { args: { reviews: [], isLoading: true, onEdit: () => {} } };
export const Empty: StoryObj<typeof ReviewList> = { args: { reviews: [], isLoading: false, onEdit: () => {} } };
export const WithReviews: StoryObj<typeof ReviewList> = {
  args: {
    isLoading: false,
    onEdit: () => {},
    reviews: [
      {
        id: "r1",
        user_id: "u1",
        book_id: "b1",
        release_id: null,
        rating: 5,
        title: "Loved it",
        body: "A great read.",
        is_public: true,
        contains_spoilers: false,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      },
    ],
  },
};
