// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("register, land on profile, log out, log back in", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const email = `e2e-${uniqueSuffix}@example.com`;
  const username = `e2e${uniqueSuffix}`;
  const password = "password123";

  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill("E2E User");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/profile/);
  await expect(page.getByText("Profile", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /E2E User/ }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login|\/$/);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/profile/);
});
