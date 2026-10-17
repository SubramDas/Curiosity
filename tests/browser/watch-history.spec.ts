import { test, expect, type Page } from "./test";
import { mockPlayer } from "./player-fixture";
import type { Video } from "../../shared/types";

const long: Video = {
  id: "abcdefghijk",
  title: "How GPUs work",
  channel: "Tech Explained",
  watchUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  reviewed: false,
  details: { duration: "PT6M24S", embeddable: true, privacyStatus: "public" },
};
const short: Video = {
  ...long,
  id: "bcdefghijkl",
  title: "A quick GPU explanation",
  details: { ...long.details!, duration: "PT45S" },
};
const done: Video = {
  ...long,
  id: "cdefghijklm",
  title: "How computers learn",
  details: { ...long.details!, duration: "PT8M16S" },
};
async function setup(page: Page, known = [long, short, done], seed = true) {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockPlayer(page);
  await page.route("**/api/config", (r) =>
    r.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/feed/home", (r) =>
    r.fulfill({ json: { trending: known, recommendations: [], messages: [] } }),
  );
  await page.route("**/api/videos/details", (r) =>
    r.fulfill({
      json: [long, short, done].filter((v) =>
        r.request().postDataJSON().ids.includes(v.id),
      ),
    }),
  );
  if (seed)
    await page.addInitScript(() => {
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      localStorage.setItem(
        "curiosity-video-progress-v1",
        JSON.stringify([
          {
            video_id: "cdefghijklm",
            topic_key: "computing:gpu",
            position_seconds: 496,
            duration_seconds: 496,
            completed: true,
            updated_at: yesterday.toISOString(),
          },
          {
            video_id: "abcdefghijk",
            topic_key: "computing:gpu",
            position_seconds: 138,
            duration_seconds: 384,
            completed: false,
            updated_at: now.toISOString(),
          },
          {
            video_id: "bcdefghijkl",
            topic_key: "computing:gpu",
            position_seconds: 20,
            duration_seconds: 45,
            completed: false,
          },
        ]),
      );
    });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Watch history", exact: true })
    .click();
}

test("Desktop history shows all playback states and resumes a long video without a search", async ({
  page,
}) => {
  await setup(page);
  const history = page.getByRole("region", {
    name: "Watch history",
    exact: true,
  });
  await expect(history.locator(".history-title")).toHaveText([
    long.title,
    done.title,
    short.title,
  ]);
  await expect(
    history.getByRole("heading", { name: "Today", exact: true }),
  ).toBeVisible();
  await expect(
    history.getByRole("heading", { name: "Yesterday", exact: true }),
  ).toBeVisible();
  await expect(
    history.getByRole("heading", { name: "Earlier", exact: true }),
  ).toBeVisible();
  await expect(
    history.getByText("Watched 2:18 of 6:24 · 4:06 left"),
  ).toBeVisible();
  await expect(history.locator(".history-thumbnail .portrait")).toHaveCount(1);
  await page.screenshot({ path: "/tmp/curiosity-watch-history.png" });
  await history
    .getByRole("button", { name: "Resume · 02:18: How GPUs work", exact: true })
    .last()
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const player = (window as any).mockPlayers.find(
          (p: any) => !p.destroyed,
        );
        return player && { position: player.position, playing: player.playing };
      }),
    )
    .toEqual({ position: 138, playing: true });
  await expect(
    page.getByText("Picking up where you left off", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "← Watch history", exact: true })
    .click();
  await expect(history).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).mockPlayers.every((p: any) => p.destroyed),
    ),
  ).toBe(true);
});

test("Completed videos restart at zero and unfinished Shorts resume without a resume shelf", async ({
  page,
}) => {
  await setup(page);
  await page
    .getByRole("button", {
      name: "Watch again: How computers learn",
      exact: true,
    })
    .last()
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const player = (window as any).mockPlayers.find(
          (p: any) => !p.destroyed,
        );
        return player && { position: player.position, playing: player.playing };
      }),
    )
    .toEqual({ position: 0, playing: true });
  await expect(
    page.getByText("Watching again from the beginning", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "← Watch history", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Resume · 00:20: A quick GPU explanation",
      exact: true,
    })
    .last()
    .click();
  await expect(page.locator(".short-player h3")).toHaveText(short.title);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).mockPlayers.find((p: any) => !p.destroyed)?.position,
      ),
    )
    .toBe(20);
  await expect(
    page.getByRole("region", { name: "Continue watching", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "← Watch history", exact: true }),
  ).toBeInViewport();
  await page.screenshot({ path: "/tmp/curiosity-history-short-resume.png" });
});

test("Missing history details can retry and unavailable videos retain their saved record", async ({
  page,
}) => {
  await setup(page, []);
  await page.route("**/api/videos/details", (r) =>
    r.fulfill({ status: 503, json: { message: "Unavailable" } }),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Watch history", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry history", exact: true }),
  ).toBeVisible();
  await page.route("**/api/videos/details", (r) => r.fulfill({ json: [null] }));
  await page
    .getByRole("button", { name: "Retry history", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry history", exact: true }),
  ).toBeVisible();
  await page.route("**/api/videos/details", (r) =>
    r.fulfill({ json: [long, short] }),
  );
  await page
    .getByRole("button", { name: "Retry history", exact: true })
    .click();
  await expect(page.locator(".history-card")).toHaveCount(2);
  await expect(
    page.getByText("Video no longer available", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".history-unavailable")).toContainText("Watched");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("curiosity-video-progress-v1")!).length,
    ),
  ).toBe(3);
});

test("History restores twenty details at a time and supports the next page", async ({
  page,
}) => {
  await setup(page, [], false);
  const videos = Array.from({ length: 21 }, (_, index) => ({
    ...long,
    id: `hist${String(index).padStart(7, "0")}`,
    title: `Saved lesson ${index + 1}`,
  }));
  const requested: string[][] = [];
  await page.route("**/api/videos/details", (r) => {
    const ids = r.request().postDataJSON().ids;
    requested.push(ids);
    return r.fulfill({ json: videos.filter((v) => ids.includes(v.id)) });
  });
  await page.addInitScript(
    (videos) =>
      localStorage.setItem(
        "curiosity-video-progress-v1",
        JSON.stringify(
          videos.map((v) => ({
            video_id: v.id,
            topic_key: "computing:gpu",
            position_seconds: 30,
            duration_seconds: 384,
            completed: false,
          })),
        ),
      ),
    videos,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Watch history", exact: true })
    .click();
  await expect(page.locator(".history-card")).toHaveCount(20);
  expect(requested.at(-1)).toHaveLength(20);
  await page
    .getByRole("navigation", { name: "History pages" })
    .getByRole("button", { name: "Next", exact: true })
    .click();
  await expect(page.locator(".history-card")).toHaveCount(1);
  await expect(page.locator(".history-title")).toHaveText("Saved lesson 21");
  expect(requested.at(-1)).toHaveLength(1);
});
