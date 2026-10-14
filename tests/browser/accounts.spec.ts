import { test, expect } from "@playwright/test";
import { accountSession, mockAccountProvider } from "./account-fixture";

async function enterCredentials(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator(".account-panel summary").click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("developer@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
}

test("Sign-in survives refresh; sign-out clears it without overwriting guest topics", async ({
  page,
}) => {
  const requests = await mockAccountProvider(page);
  await page.route("**/api/topics/list", (route) =>
    route.fulfill({
      json: [
        {
          topic_key: "computing:gpu",
          query: "Account GPUs",
          category: "computing",
          related_categories: [],
        },
      ],
    }),
  );
  await page.addInitScript(() => {
    if (!localStorage.getItem("curiosity-guest-topics-v1"))
      localStorage.setItem(
        "curiosity-guest-topics-v1",
        JSON.stringify([
          {
            key: "money:tax",
            query: "Tax",
            category: "money",
            relatedCategories: [],
          },
        ]),
      );
  });
  await enterCredentials(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".account-panel summary .sr-only")).toBeAttached();
  await page.locator(".account-panel summary").click();
  await expect(
    page.getByText("Signed in as developer@example.invalid.", { exact: false }),
  ).toBeVisible();
  expect(
    requests.filter((url) => url.includes("grant_type=password")),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("curiosity-guest-topics-v1")!)[0].query,
    ),
  ).toBe("Tax");
  await page.reload();
  await page.locator(".account-panel summary").click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("Create account signs an existing user in without signup or email", async ({
  page,
}) => {
  const requests = await mockAccountProvider(page);
  await enterCredentials(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  expect(requests.some((url) => url.split("?")[0].endsWith("/signup"))).toBe(
    false,
  );
});

test("A new account still requires email confirmation", async ({ page }) => {
  const requests = await mockAccountProvider(page, "invalid_credentials");
  await enterCredentials(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText(
    "check your email to confirm",
  );
  expect(
    requests.filter((url) => url.split("?")[0].endsWith("/signup")),
  ).toHaveLength(1);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
});

test("Unconfirmed accounts do not trigger another signup email", async ({
  page,
}) => {
  const requests = await mockAccountProvider(page, "email_not_confirmed");
  await enterCredentials(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("not confirmed yet");
  expect(requests.some((url) => url.split("?")[0].endsWith("/signup"))).toBe(
    false,
  );
});

test("Expired stored sessions renew on refresh without asking for a password", async ({
  page,
}) => {
  const requests = await mockAccountProvider(page);
  await enterCredentials(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.evaluate(
    (expired) =>
      localStorage.setItem(
        "sb-account-test-auth-token",
        JSON.stringify(expired),
      ),
    accountSession(Math.floor(Date.now() / 1000) - 3600),
  );
  await page.reload();
  await expect(page.locator(".account-panel summary .sr-only")).toBeAttached();
  expect(requests.some((url) => url.includes("grant_type=refresh_token"))).toBe(
    true,
  );
});

test("Incorrect sign-in details do not create an account or grant access", async ({
  page,
}) => {
  const requests = await mockAccountProvider(page, "invalid_credentials");
  await enterCredentials(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Cannot sign in");
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
  expect(requests.some((url) => url.split("?")[0].endsWith("/signup"))).toBe(
    false,
  );
});

test("Sign-out closes the account's active topic view and removes its saved subjects", async ({
  page,
}) => {
  await mockAccountProvider(page);
  await page.route("**/api/topics/list", (route) =>
    route.fulfill({
      json: [
        {
          topic_key: "computing:gpu",
          query: "Private account GPUs",
          category: "computing",
          related_categories: [],
        },
      ],
    }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos: [], nextPageToken: null } }),
  );
  await enterCredentials(page);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Feed topics" })
    .getByRole("button", { name: "Computing & Tech", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Private account GPUs", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Private account GPUs", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Feed topics" }).getByRole("button"),
  ).toHaveText(["Trending"]);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("curiosity-guest-topics-v1"),
    ),
  ).not.toContain("Private account GPUs");
});

test("Unconfirmed accounts can request another email and see delivery errors", async ({
  page,
}) => {
  const requests = await mockAccountProvider(page, "email_not_confirmed");
  let blocked = false;
  await page.route("**/auth/v1/resend**", (route) =>
    route.fulfill(
      blocked
        ? {
            status: 429,
            headers: {
              "X-Supabase-Api-Version": "2024-01-01",
              "Access-Control-Expose-Headers": "X-Supabase-Api-Version",
            },
            json: { code: "over_email_send_rate_limit", msg: "Limit" },
          }
        : { json: {} },
    ),
  );
  await enterCredentials(page);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Confirmation email requested",
  );
  blocked = true;
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("status")).toContainText("email service limit");
  expect(requests.some((url) => url.split("?")[0].endsWith("/signup"))).toBe(
    false,
  );
});
