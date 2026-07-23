import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChatComposer } from "./chat-composer";

const meta: Meta<typeof ChatComposer> = {
  title: "Chat/ChatComposer",
  component: ChatComposer,
  args: { onSend: () => {}, isSending: false },
};
export default meta;
type Story = StoryObj<typeof ChatComposer>;

export const Default: Story = {};
export const Sending: Story = { args: { isSending: true } };
