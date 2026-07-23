// e2e/friends.spec.ts
import { test, expect } from "./fixtures";

test("user A sends a friend request, user B accepts, both see each other as friends", async ({
  browser,
}) => {
  const suffix = Date.now();
  const userA = {
    email: `e2e-a-${suffix}@example.com`,
    username: `e2ea${suffix}`,
    password: "password123",
  };
  const userB = {
    email: `e2e-b-${suffix}@example.com`,
    username: `e2eb${suffix}`,
    password: "password123",
  };

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  await pageA.goto("/register");
  await pageA.getByLabel("Email").fill(userA.email);
  await pageA.getByLabel("Username").fill(userA.username);
  await pageA.getByLabel("Display name").fill("E2E User A");
  await pageA.getByLabel("Password").fill(userA.password);
  await pageA.getByRole("button", { name: "Create account" }).click();
  await expect(pageA).toHaveURL(/\/profile/);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto("/register");
  await pageB.getByLabel("Email").fill(userB.email);
  await pageB.getByLabel("Username").fill(userB.username);
  await pageB.getByLabel("Display name").fill("E2E User B");
  await pageB.getByLabel("Password").fill(userB.password);
  await pageB.getByRole("button", { name: "Create account" }).click();
  await expect(pageB).toHaveURL(/\/profile/);

  // User A sends a friend request to User B via the Find people tab
  await pageA.goto("/friends");
  await pageA.getByRole("tab", { name: "Find people" }).click();
  await pageA.getByLabel("Username").fill(userB.username);
  await pageA.getByRole("button", { name: "Find" }).click();
  await expect(pageA.getByText("E2E User B")).toBeVisible();
  await pageA.getByRole("button", { name: "Send friend request" }).click();
  await expect(pageA.getByText("Friend request sent.")).toBeVisible();

  // User B accepts from the Requests tab
  await pageB.goto("/friends");
  await pageB.getByRole("tab", { name: "Requests" }).click();
  await expect(pageB.getByRole("button", { name: "Accept" })).toBeVisible();
  await pageB.getByRole("button", { name: "Accept" }).click();

  // Both now see each other in their Friends tab
  await pageB.getByRole("tab", { name: "Friends" }).click();
  await expect(pageB.getByText("E2E User A")).toBeVisible();

  await pageA.goto("/friends");
  await expect(pageA.getByText("E2E User B")).toBeVisible();

  // User A views User B's profile page and sees the profile header
  await pageA.getByRole("link", { name: "View profile" }).click();
  await expect(pageA.getByText("E2E User B")).toBeVisible();
  await expect(pageA.getByRole("button", { name: "Unfriend" })).toBeVisible();

  await contextA.close();
  await contextB.close();
});
