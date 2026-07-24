import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { ContributionDiffViewer } from "./contribution-diff-viewer";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof ContributionDiffViewer> = {
  title: "Admin/ContributionDiffViewer",
  component: ContributionDiffViewer,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ContributionDiffViewer>;

export const ChangedFields: Story = {
  args: {
    diff: {
      proposed: { title: "New Title", pages: 300 },
      current: { title: "Old Title", pages: 250 },
      warnings: [],
    },
  },
};

export const NewEntity: Story = {
  args: {
    diff: { proposed: { title: "Brand New Book" }, current: null, warnings: ["Missing ISBN"] },
  },
};
