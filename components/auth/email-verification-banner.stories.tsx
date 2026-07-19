import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppQueryProvider } from "@/lib/query-client";
import { EmailVerificationBanner } from "./email-verification-banner";

const meta: Meta<typeof EmailVerificationBanner> = {
  title: "Auth/EmailVerificationBanner",
  component: EmailVerificationBanner,
  decorators: [
    (Story) => (
      <AppQueryProvider>
        <Story />
      </AppQueryProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EmailVerificationBanner>;

export const Unverified: Story = {
  args: { emailVerifiedAt: null },
};

export const Verified: Story = {
  args: { emailVerifiedAt: "2026-01-01T00:00:00Z" },
};
