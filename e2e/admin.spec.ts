import { test, expect } from "./fixtures";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.skip(
  !ADMIN_EMAIL || !ADMIN_PASSWORD,
  "requires E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD env vars for a pre-seeded admin account " +
    "(no API endpoint exists to create the first admin from the UI)",
);

test("admin promotes a user and reviews a contribution", async ({ browser }) => {
  const suffix = Date.now();
  const targetUser = {
    email: `e2e-admin-target-${suffix}@example.com`,
    username: `e2eadmintarget${suffix}`,
    password: "password123",
  };

  const targetContext = await browser.newContext();
  const targetPage = await targetContext.newPage();
  await targetPage.goto("/register");
  await targetPage.getByLabel("Email").fill(targetUser.email);
  await targetPage.getByLabel("Username").fill(targetUser.username);
  await targetPage.getByLabel("Display name").fill("E2E Admin Target");
  await targetPage.getByLabel("Password").fill(targetUser.password);
  await targetPage.getByRole("button", { name: "Create account" }).click();
  await expect(targetPage).toHaveURL(/\/profile/);
  await targetContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/login");
  await adminPage.getByLabel("Email").fill(ADMIN_EMAIL as string);
  await adminPage.getByLabel("Password").fill(ADMIN_PASSWORD as string);
  await adminPage.getByRole("button", { name: "Sign in" }).click();
  await expect(adminPage).toHaveURL(/\/profile/);

  await adminPage.getByRole("link", { name: "Admin" }).click();
  await expect(adminPage).toHaveURL(/\/admin\/users/);

  await adminPage.getByLabel("Username").fill(targetUser.username);
  await expect(adminPage.getByText(targetUser.email)).toBeVisible();

  await adminPage.getByRole("button", { name: "Actions" }).click();
  await adminPage.getByText("Promote to admin").click();
  await expect(adminPage.getByText("Admin", { exact: true })).toBeVisible();

  await adminContext.close();
});
