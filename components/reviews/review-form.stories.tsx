import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReviewForm } from "./review-form";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReviewForm> = {
  title: "Reviews/ReviewForm",
  component: ReviewForm,
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

export const Create: StoryObj<typeof ReviewForm> = { args: { bookId: "b1", onSuccess: () => {} } };
export const Edit: StoryObj<typeof ReviewForm> = {
  args: {
    onSuccess: () => {},
    review: {
      id: "r1",
      user_id: "u1",
      book_id: "b1",
      release_id: null,
      rating: 4,
      title: "Good",
      body: "Solid read.",
      is_public: true,
      contains_spoilers: false,
      created_at: "2020-01-01T00:00:00Z",
      updated_at: "2020-01-01T00:00:00Z",
    },
  },
};
