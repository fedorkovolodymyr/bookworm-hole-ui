import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UserProfileResponse } from "@/lib/api/types";
import { SuggestEditDialog } from "./suggest-edit-dialog";
import enMessages from "@/messages/en.json";

const signedInMe: UserProfileResponse = {
  id: "1",
  email: "a@b.com",
  username: "alice",
  display_name: "Alice",
  bio: null,
  avatar_url: null,
  locale: "en",
  timezone: "UTC",
  is_active: true,
  is_admin: false,
  deletion_scheduled_at: null,
};

// `msw-storybook-addon` isn't installed in this project's Storybook setup, so each
// story seeds a fresh QueryClient's `["me"]` cache directly, driving the same
// `useMe()` branch the real dialog uses (see components/shell/header.stories.tsx).
function withQueryClient(me: UserProfileResponse | null) {
  return function Decorator(Story: React.ComponentType) {
    const [queryClient] = React.useState(() => {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      client.setQueryData(["me"], me ?? undefined);
      return client;
    });

    return (
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={enMessages}>
          <Story />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );
  };
}

const meta: Meta<typeof SuggestEditDialog> = {
  title: "Catalog/SuggestEditDialog",
  component: SuggestEditDialog,
  decorators: [withQueryClient(signedInMe)],
};
export default meta;

export const NewBook: StoryObj<typeof SuggestEditDialog> = {
  args: {
    kind: "new_book",
    buildPayload: () => ({ title: "Dune", description: "A sci-fi epic." }),
  },
};

export const EditExistingBook: StoryObj<typeof SuggestEditDialog> = {
  args: {
    kind: "edit_book",
    targetId: "b1",
    buildPayload: () => ({ title: "Dune (revised)" }),
  },
};

export const SignedOut: StoryObj<typeof SuggestEditDialog> = {
  decorators: [withQueryClient(null)],
  args: {
    kind: "new_book",
    buildPayload: () => ({ title: "Dune", description: "A sci-fi epic." }),
  },
};
