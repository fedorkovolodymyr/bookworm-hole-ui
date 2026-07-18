import type { Meta, StoryObj } from "@storybook/react";
import { ThemeToggle } from "./theme-toggle";
import { ThemeProvider } from "@/lib/theme-provider";

const meta: Meta<typeof ThemeToggle> = {
  title: "Shell/ThemeToggle",
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {};
