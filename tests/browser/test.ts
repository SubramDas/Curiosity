import { test as base, expect } from "@playwright/test";

// No browser regression may fall through to configured live provider endpoints.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/api/**", (route) =>
      route.fulfill({
        status: 400,
        json: {
          message: "This API response must be simulated by the browser test.",
        },
      }),
    );
    await use(page);
  },
});
export { expect };
export type { Page } from "@playwright/test";
