// e2e/collections-reviews.spec.ts
import { test, expect } from "./fixtures";

// NOTE: like e2e/catalog-browse.spec.ts, this requires pre-seeded catalog data
// (at least one book) in whatever API the e2e run targets, plus a fresh registered
// session (register flow reused from e2e/auth.spec.ts's pattern). Skips gracefully
// if no books are present, since no seed script exists in this repo.
test.describe("collections and reviews happy path", () => {
  test("create collection, add book, review, change status, lend, return", async ({ page }) => {
    // Register a fresh user (mirrors e2e/auth.spec.ts's approach — no shared fixture exists for this yet).
    const uniqueSuffix = Date.now();
    const email = `e2e-${uniqueSuffix}@example.com`;
    const username = `e2e${uniqueSuffix}`;
    const password = "SuperSecret123!";

    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Display name").fill("E2E User");
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/profile/);

    // Create a collection.
    await page.goto("/collections");
    await page.getByRole("button", { name: /new collection/i }).click();
    await page.getByLabel("Name").fill("E2E Favorites");
    await page.getByRole("button", { name: /create collection/i }).click();
    await expect(page.getByText("E2E Favorites")).toBeVisible();

    // Find a book to attach.
    await page.goto("/books");
    const firstBookLink = page.locator('a[href^="/books/"]').first();
    const bookCount = await page.locator('a[href^="/books/"]').count();
    test.skip(bookCount === 0, "No books present in the catalog — requires seeded data.");
    await firstBookLink.click();

    // Add to collection.
    await page.getByRole("button", { name: /add to collection/i }).click();
    await page.getByRole("button", { name: "E2E Favorites" }).click();
    await expect(page.getByText(/added to e2e favorites/i)).toBeVisible();
    // Close the "Add to collection" dialog so it doesn't obscure later controls.
    await page.keyboard.press("Escape");

    // Leave a review.
    await page.getByRole("button", { name: /write a review/i }).click();
    await page.getByRole("radio", { name: "5" }).click();
    await page.getByLabel("Review").fill("Excellent read for an e2e test.");
    await page.getByRole("button", { name: /post review/i }).click();
    await expect(page.getByText("Excellent read for an e2e test.")).toBeVisible();

    // Add to library as wishlist, using the AddToLibraryControl select on the
    // book detail page (added in Task 20 specifically to give this e2e a
    // concrete, reachable status-create entry point).
    await page.getByRole("combobox", { name: /my books/i }).click();
    await page.getByRole("option", { name: "Wishlist" }).click();

    // Move to the library page, change wishlist -> owned via "Change status".
    await page.goto("/library");
    await page.getByRole("tab", { name: /wishlist/i }).click();
    await page
      .getByRole("button", { name: /change status/i })
      .first()
      .click();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Owned" }).click();
    await page.getByRole("tab", { name: /^library$/i }).click();
    await expect(page.getByText("Owned")).toBeVisible();

    // Lend it to a friend by free-text name, then mark it returned.
    await page
      .getByRole("button", { name: /lend to/i })
      .first()
      .click();
    await page.getByLabel(/or a name/i).fill("A Friend");
    await page.getByRole("button", { name: /^lend$/i }).click();
    await expect(page.getByText("A Friend")).toBeVisible();

    await page.getByRole("tab", { name: /lent out/i }).click();
    await page
      .getByRole("button", { name: /mark returned/i })
      .first()
      .click();
    await page
      .getByRole("button", { name: /mark returned/i })
      .last()
      .click();
  });
});
