// e2e/chat.spec.ts
import { test, expect } from "./fixtures";

test("user A messages user B via chat after becoming friends", async ({ browser }) => {
  const suffix = Date.now();
  const userA = {
    email: `e2e-chat-a-${suffix}@example.com`,
    username: `e2echata${suffix}`,
    password: "password123",
  };
  const userB = {
    email: `e2e-chat-b-${suffix}@example.com`,
    username: `e2echatb${suffix}`,
    password: "password123",
  };

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await pageA.goto("/register");
  await pageA.getByLabel("Email").fill(userA.email);
  await pageA.getByLabel("Username").fill(userA.username);
  await pageA.getByLabel("Display name").fill("E2E Chat A");
  await pageA.getByLabel("Password").fill(userA.password);
  await pageA.getByRole("button", { name: "Create account" }).click();
  await expect(pageA).toHaveURL(/\/profile/);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto("/register");
  await pageB.getByLabel("Email").fill(userB.email);
  await pageB.getByLabel("Username").fill(userB.username);
  await pageB.getByLabel("Display name").fill("E2E Chat B");
  await pageB.getByLabel("Password").fill(userB.password);
  await pageB.getByRole("button", { name: "Create account" }).click();
  await expect(pageB).toHaveURL(/\/profile/);

  // User A sends a friend request to User B via the Find people tab
  await pageA.goto("/friends");
  await pageA.getByRole("tab", { name: "Find people" }).click();
  await pageA.getByLabel("Username").fill(userB.username);
  await pageA.getByRole("button", { name: "Find" }).click();
  await expect(pageA.getByText("E2E Chat B")).toBeVisible();
  await pageA.getByRole("button", { name: "Send friend request" }).click();
  await expect(pageA.getByText("Friend request sent.")).toBeVisible();

  // User B accepts from the Requests tab
  await pageB.goto("/friends");
  await pageB.getByRole("tab", { name: "Requests" }).click();
  await expect(pageB.getByRole("button", { name: "Accept" })).toBeVisible();
  await pageB.getByRole("button", { name: "Accept" }).click();

  // Both now see each other in their Friends tab
  await pageB.getByRole("tab", { name: "Friends" }).click();
  await expect(pageB.getByText("E2E Chat A")).toBeVisible();

  await pageA.goto("/friends");
  await expect(pageA.getByText("E2E Chat B")).toBeVisible();

  // User A opens User B's profile and starts a conversation
  await pageA.getByRole("link", { name: "View profile" }).click();
  await expect(pageA.getByText("E2E Chat B")).toBeVisible();
  await pageA.getByRole("button", { name: "Message" }).click();
  await expect(pageA).toHaveURL(/\/chat\/.+/);

  const messageBody = `Hello from A ${suffix}`;
  await pageA.getByPlaceholder("Write a message...").fill(messageBody);
  await pageA.getByRole("button", { name: "Send" }).click();
  await expect(pageA.getByText(messageBody)).toBeVisible();

  // User B navigates to /chat, sees the thread, opens it, sees the message
  await pageB.goto("/chat");
  await expect(pageB.getByText("E2E Chat A")).toBeVisible();
  await expect(pageB.getByText(messageBody)).toBeVisible();
  await pageB.getByText("E2E Chat A").click();
  await expect(pageB).toHaveURL(/\/chat\/.+/);
  await expect(pageB.getByText(messageBody)).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test("AI panels show coming-soon state for recommendations, summary, and tag suggestions", async ({
  browser,
}) => {
  const suffix = Date.now();
  const user = {
    email: `e2e-ai-${suffix}@example.com`,
    username: `e2eai${suffix}`,
    password: "password123",
  };

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/register");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Display name").fill("E2E AI User");
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/profile/);

  await page.goto("/ai");

  // Recommendations panel
  await page.getByRole("button", { name: "Get recommendations" }).click();
  await expect(page.getByText("Coming soon")).toHaveCount(1);

  // Summary panel
  await page.getByPlaceholder("Text to summarize").fill("Some sample text to summarize.");
  await page.getByRole("button", { name: "Summarize" }).click();
  await expect(page.getByText("Coming soon")).toHaveCount(2);

  // Tag suggestions panel
  await page.locator("#tag-suggest-book-id").fill("00000000-0000-0000-0000-000000000000");
  await page.getByRole("button", { name: "Suggest tags" }).click();
  await expect(page.getByText("Coming soon")).toHaveCount(3);

  await context.close();
});
