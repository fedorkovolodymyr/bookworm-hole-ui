import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppShell } from "./app-shell";
import { ThemeProvider } from "@/lib/theme-provider";

const meta: Meta<typeof AppShell> = {
  title: "Shell/AppShell",
  component: AppShell,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
  args: {
    children: <p>Page content goes here.</p>,
  },
};
