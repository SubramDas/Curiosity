import type { Page } from "@playwright/test";

export function accountSession(
  expiresAt = Math.floor(Date.now() / 1000) + 3600,
) {
  const user = {
    id: "c8891d36-f88a-4b09-bf30-a736ba435a74",
    email: "developer@example.invalid",
    aud: "authenticated",
    role: "authenticated",
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: expiresAt, aud: "authenticated" })}.test-signature`,
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: "bearer",
    user,
  };
}

export async function mockAccountProvider(page: Page, loginError?: string) {
  const requests: string[] = [];
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: {
        supabaseConfigured: true,
        supabaseUrl: "https://account-test.supabase.co",
        supabasePublishableKey: "sb_publishable_test-only",
      },
    }),
  );
  await page.route(
    "https://account-test.supabase.co/auth/v1/**",
    async (route) => {
      const url = new URL(route.request().url());
      requests.push(url.pathname + url.search);
      if (url.pathname.endsWith("/token")) {
        if (loginError && url.searchParams.get("grant_type") === "password")
          return route.fulfill({
            status: 400,
            headers: {
              "X-Supabase-Api-Version": "2024-01-01",
              "Access-Control-Expose-Headers": "X-Supabase-Api-Version",
            },
            json: {
              code: loginError,
              msg: "Cannot sign in with these details.",
            },
          });
        return route.fulfill({ json: accountSession() });
      }
      if (url.pathname.endsWith("/signup"))
        return route.fulfill({
          json: { user: accountSession().user, session: null },
        });
      if (url.pathname.endsWith("/logout"))
        return route.fulfill({ status: 204 });
      if (url.pathname.endsWith("/user"))
        return route.fulfill({ json: accountSession().user });
      throw new Error(`Unexpected simulated auth request: ${url.pathname}`);
    },
  );
  await page.route("**/api/topics/list", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/progress/list", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: [], recommendations: [], messages: [] },
    }),
  );
  return requests;
}
