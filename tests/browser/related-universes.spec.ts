import { test, expect, type Page } from "./test";
import { mockPlayer } from "./player-fixture";
import type { Video } from "../../shared/types";
const base: Video = {
  id: "abcdefghijk",
  title: "How GPUs power the AI boom",
  channel: "Tech Explained",
  watchUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  reviewed: false,
  details: { duration: "PT6M24S", embeddable: true, privacyStatus: "public" },
  classification: {
    topic: { label: "Graphics & GPUs", wikidataId: null, status: "matched" },
    primaryUniverse: "science",
    relatedUniverses: ["commerce"],
    reason: "Connects GPU technology and business.",
    policyVersion: "1",
  },
};
const videos: Video[] = [
  base,
  {
    ...base,
    id: "bcdefghijkl",
    title: "An idea worth exploring",
    classification: { ...base.classification!, relatedUniverses: [] },
  },
  {
    ...base,
    id: "cdefghijklm",
    title: "How AI changes creative work",
    classification: {
      ...base.classification!,
      topic: {
        label: "Artificial intelligence and creative work across industries",
        wikidataId: null,
        status: "matched",
      },
      relatedUniverses: ["commerce", "arts"],
    },
  },
];
async function setup(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockPlayer(page);
  await page.route("**/api/config", (r) =>
    r.fulfill({
      json: { supabaseConfigured: false, videoClassificationEnabled: true },
    }),
  );
  await page.route("**/api/feed/home", (r) =>
    r.fulfill({
      json: { trending: videos, recommendations: [], messages: [] },
    }),
  );
  await page.route("**/api/videos/details", (r) => r.fulfill({ json: videos }));
  await page.goto("/");
  return page.locator(".feed-section .video-result");
}
const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Also related to", exact: true });

test("Desktop popovers keep metadata in place and support keyboard and outside dismissal without playing", async ({
  page,
}) => {
  const cards = await setup(page);
  const card = cards.first();
  const trigger = card.getByRole("button", {
    name: "1 related Universe",
    exact: true,
  });
  await expect(cards.nth(1).locator(".related-universe-trigger")).toHaveCount(
    0,
  );
  const title = await card.locator(".video-select-title").boundingBox();
  const creator = await card
    .locator(".video-copy > small")
    .first()
    .boundingBox();
  await trigger.focus();
  await trigger.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(dialog(page).getByRole("listitem")).toHaveText(
    "Commerce & Business",
  );
  expect(await card.locator(".video-select-title").boundingBox()).toEqual(
    title,
  );
  expect(
    await card.locator(".video-copy > small").first().boundingBox(),
  ).toEqual(creator);
  await page.keyboard.press("Tab");
  await expect(
    dialog(page).getByRole("button", { name: "Close related Universes" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Space");
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole("listitem").click();
  await expect(page.locator(".player-section")).toHaveCount(0);
  await dialog(page)
    .getByRole("button", { name: "Close related Universes" })
    .click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(240, 160);
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => (window as any).mockPlayers.length)).toBe(0);
});

test("Only one popover opens, right-edge content stays inside the viewport and can flip above", async ({
  page,
}) => {
  const cards = await setup(page);
  await cards
    .first()
    .getByRole("button", { name: "1 related Universe", exact: true })
    .click();
  const trigger = cards
    .nth(2)
    .getByRole("button", { name: "2 related Universes", exact: true });
  await trigger.click();
  await expect(dialog(page)).toHaveCount(1);
  await expect(dialog(page).getByRole("listitem")).toHaveText([
    "Commerce & Business",
    "Arts & Humanities",
  ]);
  await expect(
    cards
      .first()
      .getByRole("button", { name: "1 related Universe", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  let bounds = (await dialog(page).boundingBox())!;
  const anchor = (await trigger.boundingBox())!;
  const primary = (await cards
    .nth(2)
    .locator(".universe-video-label > span")
    .first()
    .boundingBox())!;
  expect(anchor.x).toBeGreaterThanOrEqual(primary.x + primary.width + 9);
  expect(Math.abs(anchor.y - primary.y)).toBeLessThan(2);
  expect(bounds.x).toBeGreaterThanOrEqual(16);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1424);
  expect(
    Math.abs(bounds.x + bounds.width - anchor.x - anchor.width),
  ).toBeLessThan(2);
  await page.screenshot({
    path: "/tmp/curiosity-related-universes-desktop.png",
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({
    width: 1440,
    height: Math.ceil(anchor.y + anchor.height + 60),
  });
  await trigger.click();
  await expect(dialog(page)).toHaveAttribute("data-placement", "above");
  bounds = (await dialog(page).boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(16);
  await page.setViewportSize({ width: 1280, height: 700 });
  await expect
    .poll(async () => {
      const rect = await dialog(page).boundingBox();
      return (
        rect &&
        rect.x >= 16 &&
        rect.x + rect.width <= 1264 &&
        rect.y >= 16 &&
        rect.y + rect.height <= 684
      );
    })
    .toBe(true);
});

test("History and selected player metadata share the popover without clipping or resetting playback", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "curiosity-video-progress-v1",
      JSON.stringify([
        {
          video_id: "abcdefghijk",
          topic_key: "computing:gpu",
          position_seconds: 72,
          duration_seconds: 384,
          completed: false,
        },
      ]),
    ),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Watch history", exact: true })
    .click();
  await page.addStyleTag({ content: ".history-card { overflow: hidden; }" });
  await page
    .locator(".history-card")
    .getByRole("button", { name: "1 related Universe", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page)
    .getByRole("button", { name: "Close related Universes" })
    .click();
  await page
    .getByRole("button", {
      name: "Resume · 01:12: How GPUs power the AI boom",
      exact: true,
    })
    .last()
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).mockPlayers.find((p: any) => !p.destroyed)?.position,
      ),
    )
    .toBe(72);
  const before = await page.evaluate(() =>
    (window as any).mockPlayers.map((p: any) => ({
      position: p.position,
      playing: p.playing,
      destroyed: p.destroyed,
    })),
  );
  await page
    .locator(".player-section")
    .getByRole("button", { name: "1 related Universe", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() =>
      (window as any).mockPlayers.map((p: any) => ({
        position: p.position,
        playing: p.playing,
        destroyed: p.destroyed,
      })),
    ),
  ).toEqual(before);
});

test("Switching to mobile removes the desktop popover and retains the existing details control", async ({
  page,
}) => {
  const cards = await setup(page);
  await cards
    .first()
    .getByRole("button", { name: "1 related Universe", exact: true })
    .click();
  await expect(dialog(page)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".desktop-related-popover")).toHaveCount(0);
  await expect(page.locator(".related-universe-trigger")).toHaveCount(0);
  const details = page.locator(".universe-related-details").first();
  await details.locator("summary").click();
  await expect(details.locator("span")).toHaveText("Commerce & Business");
});
