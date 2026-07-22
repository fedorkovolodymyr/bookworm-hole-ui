import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/lib/theme-provider";
import type { UserProfileResponse } from "@/lib/api/types";
import { Header } from "./header";
import enMessages from "@/messages/en.json";

// `msw-storybook-addon` isn't installed in this project's Storybook setup, and the
// existing `tests/mocks/server` uses msw's node `setupServer`, which doesn't run in
// the browser-based Storybook build. Instead, each story seeds a fresh QueryClient's
// `["me"]` cache directly, which drives the same `useMe()` branch the real header uses.
function withQueryClient(me: UserProfileResponse | null) {
  return function Decorator(Story: React.ComponentType) {
    const [queryClient] = React.useState(() => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      client.setQueryData(["me"], me ?? undefined);
      return client;
    });

    return (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <Story />
          </QueryClientProvider>
        </ThemeProvider>
      </NextIntlClientProvider>
    );
  };
}

const meta: Meta<typeof Header> = {
  title: "Shell/Header",
  component: Header,
};

export default meta;
type Story = StoryObj<typeof Header>;

export const SignedOut: Story = {
  decorators: [withQueryClient(null)],
};

export const SignedIn: Story = {
  decorators: [
    withQueryClient({
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
    }),
  ],
};
