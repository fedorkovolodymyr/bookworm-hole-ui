// e2e/catalog-browse.spec.ts
import { test, expect } from "./fixtures";

// NOTE: These tests require pre-seeded catalog data in whatever API the e2e run
// targets (at least one book, and one book matching/containing "Dune" for the
// filter test). Unlike e2e/auth.spec.ts (which creates its own user via the
// register flow and needs no fixtures), there is currently no seed script,
// docker-compose service, or fixture setup in this repo that provisions books
// — see .env.example (API_BASE_URL points at an external bookworm-hole-api
// instance) and playwright.config.ts (webServer only starts `pnpm dev`, it
// does not seed data). The first test skips gracefully if the book list is
// empty rather than hard-failing; the second test (filter by "Dune") has no
// safe empty-state fallback and will fail if that title isn't seeded.
test.describe("catalog browse", () => {
  test("visitor can browse books and open a detail page", async ({ page }) => {
    await page.goto("/books");
    await expect(page.getByRole("heading", { name: /browse books/i })).toBeVisible();

    const firstBookLink = page.locator('a[href^="/books/"]').first();
    const bookCount = await page.locator('a[href^="/books/"]').count();
    test.skip(bookCount === 0, "No books present in the catalog — requires seeded data.");

    await expect(firstBookLink).toBeVisible();
    const bookTitle = await firstBookLink.locator('[data-slot="card-title"]').innerText();
    await firstBookLink.click();

    await expect(page.getByRole("heading", { name: bookTitle })).toBeVisible();
    await expect(page.getByText(/editions/i)).toBeVisible();
  });

  test("visitor can filter books by title", async ({ page }) => {
    await page.goto("/books");
    await page.getByLabel("Title").fill("Dune");
    await expect(page.locator('a[href^="/books/"]')).toHaveCount(1, { timeout: 10000 });
  });
});
