import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ReleaseCard } from "./release-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ReleaseCard> = {
  title: "Catalog/ReleaseCard",
  component: ReleaseCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const baseRelease = {
  id: "r1",
  format: "hardcover" as const,
  publisher: "Ace Books",
  published_year: 1965,
  language: "en",
  page_count: 412,
  duration_minutes: null,
  cover_image_url: null,
  description_override: null,
  isbns: [],
  average_rating: 4.5,
  rating_count: 10,
};

export const Default: StoryObj<typeof ReleaseCard> = { args: { release: baseRelease } };
export const Unrated: StoryObj<typeof ReleaseCard> = {
  args: { release: { ...baseRelease, average_rating: null, rating_count: 0 } },
};
export const Audiobook: StoryObj<typeof ReleaseCard> = {
  args: {
    release: { ...baseRelease, format: "audiobook", duration_minutes: 620, page_count: null },
  },
};
