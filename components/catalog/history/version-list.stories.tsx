import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { VersionList } from "./version-list";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof VersionList> = {
  title: "Catalog/History/VersionList",
  component: VersionList,
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

const versions = [
  {
    id: "v2",
    entity_type: "book" as const,
    entity_id: "b1",
    version_number: 2,
    changed_by_user_id: "u1",
    change_source: "admin" as const,
    contribution_id: null,
    created_at: "2020-02-01T00:00:00Z",
  },
  {
    id: "v1",
    entity_type: "book" as const,
    entity_id: "b1",
    version_number: 1,
    changed_by_user_id: null,
    change_source: "system" as const,
    contribution_id: null,
    created_at: "2020-01-01T00:00:00Z",
  },
];

export const Default: StoryObj<typeof VersionList> = { args: { versions, onSelect: () => {} } };
export const Empty: StoryObj<typeof VersionList> = { args: { versions: [], onSelect: () => {} } };
