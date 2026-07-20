import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { LocaleSwitcher } from "./locale-switcher";
import enMessages from "@/messages/en.json";

const meta: Meta<typeof LocaleSwitcher> = {
  title: "Shell/LocaleSwitcher",
  component: LocaleSwitcher,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

export const Default: StoryObj<typeof LocaleSwitcher> = {};
