import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
};
export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="reading" className="w-80">
      <TabsList>
        <TabsTrigger value="reading">Reading</TabsTrigger>
        <TabsTrigger value="finished">Finished</TabsTrigger>
      </TabsList>
      <TabsContent value="reading">Books currently being read.</TabsContent>
      <TabsContent value="finished">Books finished.</TabsContent>
    </Tabs>
  ),
};
