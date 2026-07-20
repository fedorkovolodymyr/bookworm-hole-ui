import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { VersionDiffViewer } from "./version-diff-viewer";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof VersionDiffViewer> = {
  title: "Catalog/History/VersionDiffViewer",
  component: VersionDiffViewer,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <div className="max-w-lg">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

const before = {
  id: "v1",
  entity_type: "book" as const,
  entity_id: "b1",
  version_number: 1,
  changed_by_user_id: null,
  change_source: "system" as const,
  contribution_id: null,
  created_at: "2020-01-01T00:00:00Z",
  snapshot: { title: "Dune", description: "Old description" },
};

const after = {
  ...before,
  id: "v2",
  version_number: 2,
  snapshot: { title: "Dune", description: "New description", first_publication_year: 1965 },
};

export const WithChanges: StoryObj<typeof VersionDiffViewer> = { args: { before, after } };
export const NoBefore: StoryObj<typeof VersionDiffViewer> = { args: { after } };
export const NoDiff: StoryObj<typeof VersionDiffViewer> = { args: { before, after: before } };
