import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ContributorCard } from "./contributor-card";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ContributorCard> = {
  title: "Catalog/ContributorCard",
  component: ContributorCard,
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

const baseContributor = {
  id: "c1",
  full_name: "Frank Herbert",
  sort_name: "Herbert, Frank",
  birth_year: 1920,
  death_year: 1986,
  bio: "American science fiction writer, best known for Dune.",
  slug: "frank-herbert",
  created_at: "2020-01-01T00:00:00Z",
  updated_at: "2020-01-01T00:00:00Z",
};

export const Default: StoryObj<typeof ContributorCard> = { args: { contributor: baseContributor } };
export const NoBio: StoryObj<typeof ContributorCard> = {
  args: { contributor: { ...baseContributor, bio: null } },
};
