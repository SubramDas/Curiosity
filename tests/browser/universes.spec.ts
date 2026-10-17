import { test, expect, type Page } from "./test";
import { mockPlayer } from "./player-fixture";
const video = {
  id: "Kgcfj_KV-mo",
  title: "How GPUs work",
  channel: "Example",
  watchUrl: "https://www.youtube.com/watch?v=Kgcfj_KV-mo",
  reviewed: false,
  details: { embeddable: true, privacyStatus: "public", duration: "PT6M24S" },
};
const mixed = [
  video,
  { ...video, id: "abcdefghijk", title: "NVIDIA stock valuation" },
  { ...video, id: "lmnopqrstuv", title: "English literature explained" },
  { ...video, id: "mnopqrstuvw", title: "A surprising discovery" },
  {
    ...video,
    id: "nopqrstuvwx",
    title: "AI in a minute",
    details: { ...video.details, duration: "PT1M" },
  },
];
async function setup(page: Page) {
  await mockPlayer(page);
  await page.route("**/api/config", (r) =>
    r.fulfill({
      json: { supabaseConfigured: false, videoClassificationEnabled: true },
    }),
  );
  await page.route("**/api/videos/classify", async (route) => {
    const { id } = route.request().postDataJSON();
    const labels: Record<string, [string | null, string, string[]]> = {
      "Kgcfj_KV-mo": ["science", "Graphics & GPUs", []],
      abcdefghijk: ["commerce", "Business & markets", ["science"]],
      lmnopqrstuv: ["arts", "Literature", []],
      mnopqrstuvw: [null, "Unclassified", []],
      nopqrstuvwx: ["science", "Artificial intelligence", []],
    };
    const [primaryUniverse, label, relatedUniverses] = labels[id];
    await route.fulfill({
      json: {
        videoId: id,
        classification: {
          topic: {
            label,
            wikidataId: primaryUniverse ? "Q1" : null,
            status: primaryUniverse ? "matched" : "provisional",
          },
          primaryUniverse,
          relatedUniverses,
          reason: "Simulated metadata classification",
          policyVersion: "1",
        },
      },
    });
  });
  await page.route("**/api/feed/home", (r) =>
    r.fulfill({ json: { trending: mixed, recommendations: [], messages: [] } }),
  );
  await page.route("**/api/search", (r) =>
    r.fulfill({
      json: {
        decision: {
          action: "allow",
          reason: "Simulated learning request.",
          choices: [],
        },
        videos: mixed,
        nextPageToken: null,
      },
    }),
  );
  await page.route("**/api/videos/details", (r) => r.fulfill({ json: mixed }));
}
test("Desktop Universe feeds open directly; subject filters reuse results and old searches remain intact", async ({
  page,
}) => {
  await setup(page);
  const saved = [
    {
      key: "computing:gpu",
      query: "GPUs",
      category: "computing",
      relatedCategories: [],
    },
  ];
  await page.addInitScript(
    (topics) =>
      localStorage.setItem("curiosity-guest-topics-v1", JSON.stringify(topics)),
    saved,
  );
  let requests = 0;
  await page.route("**/api/feed/universe", (r) => {
    requests++;
    return r.fulfill({
      json: {
        trending: [],
        recommendations: [{ query: "GPUs", videos: mixed }],
        messages: [],
      },
    });
  });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Universes" });
  await expect(nav.getByRole("button")).toHaveText([
    "Trending",
    "Science & Technology",
    "Commerce & Business",
    "Arts & Humanities",
  ]);
  await nav
    .getByRole("button", { name: "Science & Technology", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Science & Technology", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(1); // Only the primary Universe controls placement.
  await page
    .getByRole("navigation", { name: "Subject filters" })
    .getByRole("button", { name: "Graphics & GPUs", exact: true })
    .click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(1);
  expect(requests).toBe(1);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("curiosity-guest-topics-v1")!),
    ),
  ).toEqual(saved);
  await page.screenshot({
    path: "/tmp/curiosity-desktop-universe-science.png",
    fullPage: true,
  });
});
test("Mixed searches show per-video labels between title and creator, keeping unclear videos watchable", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/");
  await page.getByLabel("Search any topic").fill("How GPUs affect our world");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const gpu = page.locator(".video-card").filter({ hasText: "How GPUs work" });
  await expect(gpu.locator(".universe-video-label")).toHaveText(
    "Science & Technology – Graphics & GPUs",
  );
  const positions = await gpu.evaluate((el) => {
    const title = el.querySelector("strong")!.getBoundingClientRect();
    const label = el
      .querySelector(".universe-video-label")!
      .getBoundingClientRect();
    const creator = el
      .querySelector(".video-copy > small")!
      .getBoundingClientRect();
    return {
      title: title.bottom,
      labelTop: label.top,
      labelBottom: label.bottom,
      creator: creator.top,
    };
  });
  expect(positions.title).toBeLessThanOrEqual(positions.labelTop);
  expect(positions.labelBottom).toBeLessThanOrEqual(positions.creator);
  await expect(
    page
      .locator(".video-card")
      .filter({ hasText: "NVIDIA stock valuation" })
      .locator(".universe-video-label"),
  ).toContainText("Commerce & Business – Business & markets");
  await expect(
    page
      .locator(".video-card")
      .filter({ hasText: "A surprising discovery" })
      .locator(".universe-video-label"),
  ).toHaveCount(0);
  await page.screenshot({
    path: "/tmp/curiosity-desktop-universe-search.png",
    fullPage: true,
  });
});
test("A normal desktop video click starts at saved progress without a separate Resume button", async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "curiosity-video-progress-v1",
      JSON.stringify([
        {
          video_id: "Kgcfj_KV-mo",
          topic_key: "computing:gpu",
          position_seconds: 72,
          duration_seconds: 384,
          completed: false,
        },
      ]),
    ),
  );
  await page.goto("/");
  await page
    .locator(".feed-section .video-card")
    .filter({ hasText: "How GPUs work" })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers.at(-1)?.seeks))
    .toEqual([72]);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).mockPlayers.at(-1)?.playing),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: /^(Resume|Play) video$/ }),
  ).toHaveCount(0);
  await page.evaluate(() => (window as any).mockPlayers.at(-1).pause());
  await page.reload();
  await page
    .locator(".feed-section .video-card")
    .filter({ hasText: "How GPUs work" })
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers.at(-1)?.seeks))
    .toEqual([72]);
  await page.screenshot({
    path: "/tmp/curiosity-desktop-universe-player.png",
    fullPage: true,
  });
});

test("Feed failures can retry, and unassigned legacy searches remain accessible", async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "curiosity-guest-topics-v1",
      JSON.stringify([
        {
          key: "life:cooking",
          query: "Cooking",
          category: "life",
          relatedCategories: [],
        },
      ]),
    ),
  );
  let calls = 0;
  await page.route("**/api/feed/universe", (r) => {
    calls++;
    return r.fulfill(
      calls === 1
        ? { status: 400, json: { message: "Connection unavailable." } }
        : {
            json: {
              trending: [],
              recommendations: [{ query: "science", videos: [video] }],
              messages: [],
            },
          },
    );
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Universes" })
    .getByRole("button", { name: "Science & Technology", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Connection unavailable.",
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator(".universe-feed .video-card")).toHaveCount(1);
  await page.getByText("Other saved searches", { exact: true }).click();
  await page.getByRole("button", { name: "Cooking", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Cooking", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Universes" })
      .locator('[aria-pressed="true"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("curiosity-guest-topics-v1")!)[0].key,
    ),
  ).toBe("life:cooking");
});
