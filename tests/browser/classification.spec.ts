import { test, expect, type Page } from "./test";
import { mockPlayer } from "./player-fixture";
const video = {
  id: "abcdefghijk",
  title: "Cooking: why bread turns brown",
  channel: "Example",
  watchUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  reviewed: false,
  details: { duration: "PT6M", embeddable: true, privacyStatus: "public" },
};
const classification = {
  topic: { label: "Food chemistry", wikidataId: "Q123", status: "matched" },
  primaryUniverse: "science",
  relatedUniverses: ["arts"],
  reason: "Explains chemical reactions and demonstrates cooking techniques.",
  policyVersion: "1",
};
async function setup(page: Page) {
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: { supabaseConfigured: false, videoClassificationEnabled: true },
    }),
  );
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: [video], recommendations: [], messages: [] },
    }),
  );
  await page.route("**/api/feed/universe", (route) =>
    route.fulfill({
      json: {
        trending: [],
        recommendations: [{ query: "science", videos: [video] }],
        messages: [],
      },
    }),
  );
}

test("Videos appear before classification; semantic labels expand without playing and belong only to the primary Universe", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route("**/api/videos/classify", async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({
      id: video.id,
      background: true,
    });
    await held;
    await route.fulfill({ json: { videoId: video.id, classification } });
  });
  await page.goto("/");
  await expect(page.locator(".video-card")).toHaveCount(1);
  await expect(
    page.getByText("Waiting for topic", { exact: true }),
  ).toBeVisible();
  release();
  await expect(page.locator(".universe-video-label")).toContainText(
    "Science & Technology – Food chemistry",
  );
  await page
    .getByRole("group")
    .filter({ has: page.getByText("+1", { exact: true }) })
    .locator("summary")
    .click();
  await expect(page.locator(".universe-related-details > span")).toHaveText(
    "Arts & Humanities",
  );
  await expect(page.locator(".player-section")).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "Universes" });
  await nav
    .getByRole("button", { name: "Arts & Humanities", exact: true })
    .click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(0);
  await nav
    .getByRole("button", { name: "Science & Technology", exact: true })
    .click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Food chemistry", exact: true }),
  ).toBeVisible();
  expect(calls).toBe(1);
  await page.screenshot({
    path: "/tmp/curiosity-classification-desktop.png",
    fullPage: true,
  });
});

test("Phone classification failure preserves browsing and manual retry can show a provisional topic", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  let calls = 0;
  await page.route("**/api/videos/classify", async (route) => {
    calls++;
    await route.fulfill(
      calls === 1
        ? {
            status: 400,
            json: {
              code: "NETWORK_ERROR",
              message: "Classification connection unavailable.",
            },
          }
        : {
            json: {
              videoId: video.id,
              classification: {
                ...classification,
                topic: {
                  label: "Food chemistry",
                  wikidataId: null,
                  status: "provisional",
                },
              },
            },
          },
    );
  });
  await page.goto("/");
  await expect(page.locator(".video-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Retry label", exact: true }).click();
  await expect(
    page.getByText("Provisional topic", { exact: true }),
  ).toBeVisible();
  await page.locator(".universe-related-details summary").click();
  await expect(page.locator(".universe-related-details > span")).toHaveText(
    "Arts & Humanities",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/curiosity-classification-mobile.png",
    fullPage: true,
  });
  expect(calls).toBe(2);
});

test("Offscreen videos wait until scrolling brings them into view", async ({
  page,
}) => {
  await setup(page);
  const videos = Array.from({ length: 15 }, (_, index) => ({
    ...video,
    id: String(index).padStart(11, "0"),
    title: `Example video number ${index}`,
  }));
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: videos, recommendations: [], messages: [] },
    }),
  );
  const requested: string[] = [];
  await page.route("**/api/videos/classify", async (route) => {
    const { id } = route.request().postDataJSON();
    requested.push(id);
    await route.fulfill({ json: { videoId: id, classification } });
  });
  await page.goto("/");
  await expect.poll(() => requested.length).toBeGreaterThan(0);
  const last = videos.at(-1)!;
  expect(requested).not.toContain(last.id);
  await page
    .locator(".video-card")
    .filter({ hasText: last.title })
    .scrollIntoViewIfNeeded();
  await expect.poll(() => requested.includes(last.id)).toBe(true);
  expect(new Set(requested).size).toBe(requested.length);
});

test("Queued classification changes to finding and completes through status polls", async ({
  page,
}) => {
  await setup(page);
  let requests = 0;
  await page.route("**/api/videos/classify", async (route) => {
    requests++;
    const { id, background } = route.request().postDataJSON();
    expect(background).toBe(true);
    await route.fulfill(
      requests < 3
        ? {
            status: 202,
            json: {
              videoId: id,
              status: requests === 1 ? "waiting" : "finding",
            },
          }
        : { json: { videoId: id, status: "ready", classification } },
    );
  });
  await page.goto("/");
  await expect(
    page.getByText("Waiting for topic", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Finding topic…", { exact: true })).toBeVisible();
  await expect(page.locator(".universe-video-label")).toContainText(
    "Food chemistry",
  );
  expect(requests).toBe(3);
});

test("Approved search videos appear in their Universe and Topic after reload even when fresh discovery fails", async ({
  page,
}) => {
  await setup(page);
  let approved = false;
  let labeled = false;
  let classifications = 0;
  let releaseDiscovery!: () => void;
  const discovery = new Promise<void>((resolve) => {
    releaseDiscovery = resolve;
  });
  await page.route("**/api/search", (route) => {
    approved = true;
    return route.fulfill({
      json: {
        decision: { action: "allow", reason: "Learning request", choices: [] },
        videos: [video],
        nextPageToken: null,
      },
    });
  });
  await page.route("**/api/videos/classify", (route) => {
    classifications++;
    labeled = true;
    return route.fulfill({ json: { videoId: video.id, classification } });
  });
  await page.route("**/api/feed/universe/catalog", (route) => {
    const { universe } = route.request().postDataJSON();
    return route.fulfill({
      json: {
        videos:
          approved && labeled && universe === "science"
            ? [{ ...video, classification }]
            : [],
      },
    });
  });
  await page.route("**/api/feed/universe", async (route) => {
    await discovery;
    return route.fulfill({
      status: 503,
      json: { message: "Fresh discovery is unavailable." },
    });
  });
  await page.goto("/");
  await page.getByLabel("Search any topic").fill("Bread chemistry");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".universe-video-label")).toContainText(
    "Food chemistry",
  );
  const nav = page.getByRole("navigation", { name: "Universes" });
  await nav
    .getByRole("button", { name: "Science & Technology", exact: true })
    .click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(1);
  releaseDiscovery();
  await page
    .getByRole("button", { name: "Food chemistry", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: video.title, exact: true }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "Arts & Humanities", exact: true })
    .click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Universes" })
    .getByRole("button", { name: "Science & Technology", exact: true })
    .click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(1);
  expect(classifications).toBeLessThanOrEqual(2); // Home is independently classified after reload.
  await page.getByRole("button", { name: video.title, exact: true }).click();
  await expect(page.getByText(`Mock player ${video.id}`)).toBeVisible();
});

test("Daily label limits show a paused state while another video's cached label remains available", async ({
  page,
}) => {
  await setup(page);
  const cached = {
    ...video,
    id: "bcdefghijkl",
    title: "Food chemistry explained",
  };
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: [video, cached], recommendations: [], messages: [] },
    }),
  );
  await page.route("**/api/feed/universe/catalog", (route) =>
    route.fulfill({ json: { videos: [video, { ...cached, classification }] } }),
  );
  let cachedLookups = 0;
  await page.route("**/api/videos/classify", (route) => {
    const { id } = route.request().postDataJSON();
    if (id === video.id)
      return route.fulfill({
        status: 400,
        json: {
          code: "LOCAL_LIMIT",
          message:
            "The local daily classification allowance is used. Try again tomorrow.",
        },
      });
    cachedLookups++;
    return route.fulfill({ json: { videoId: id, classification } });
  });
  await page.goto("/");
  await expect(
    page.getByText("Daily label limit reached", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".universe-video-label")).toContainText(
    "Food chemistry",
  );
  expect(cachedLookups).toBe(1);
  await expect(page.getByRole("button", { name: "Retry label" })).toHaveCount(
    0,
  );
  await page
    .getByRole("navigation", { name: "Universes" })
    .getByRole("button", { name: "Science & Technology", exact: true })
    .click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(1);
  await expect(
    page.getByText("Checking a video's subject", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Daily label limit reached", { exact: true }),
  ).toBeVisible();
});
