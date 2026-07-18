import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./header";
import { ThemeProvider } from "@/lib/theme-provider";

const meta: Meta<typeof Header> = {
  title: "Shell/Header",
  component: Header,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Header>;

export const Default: Story = {};
