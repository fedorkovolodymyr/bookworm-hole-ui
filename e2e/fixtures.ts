// e2e/fixtures.ts
import { test as base, expect } from "@playwright/test";

// Wraps the base Playwright `test` so every spec automatically fails on
// unexpected browser console errors (e.g. React/Base UI warnings logged via
// console.error), instead of those only surfacing in a dev console someone
// happens to be watching.
export const test = base.extend({
  page: async ({ page }, use) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      // Expected noise: unauthenticated `/api/users/me` probes 401 before login,
      // and the browser logs the failed fetch as a console error.
      if (msg.type() === "error" && !/status of 401/.test(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture `use`, not a React hook
    await use(page);

    expect(consoleErrors, "Unexpected browser console errors").toEqual([]);
  },
});

export { expect };
