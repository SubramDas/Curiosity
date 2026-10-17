import { test, expect, type Page } from "./test";
import { mockPlayer } from "./player-fixture";
const video = {
  id: "abcdefghijk",
  title: "How GPUs work",
  channel: "Example",
  reviewed: false,
  watchUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  details: { embeddable: true, privacyStatus: "public", duration: "PT6M" },
};
const suggested = {
  ...video,
  id: "bcdefghijkl",
  title: "Parallel processing explained",
  watchUrl: "https://www.youtube.com/watch?v=bcdefghijkl",
};
const answer = (text: string) => ({
  answer: text,
  relation: "related",
  relationReason: "Explains the current topic.",
  videoContext: "analyzed",
  answerBasis: "video-analysis",
  sources: [
    {
      id: "source",
      title: "Example reference",
      url: "https://example.com/reference",
    },
  ],
  timestamp: {
    videoId: video.id,
    startSeconds: 93,
    endSeconds: 110,
    explanation: "Parallel work",
    evidence: "Many workers share the job.",
  },
  recommendations: [suggested],
  notices: [],
  questionVideo: { id: video.id, title: video.title },
});
async function setup(page: Page, height = 1000) {
  await page.setViewportSize({ width: 1440, height });
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({
      json: { supabaseConfigured: false, videoClassificationEnabled: false },
    }),
  );
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: [video], recommendations: [], messages: [] },
    }),
  );
  await page.route("https://i.ytimg.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#176B4C"/></svg>',
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: video.title, exact: true }).click();
  await expect(page.getByText(`Mock player ${video.id}`)).toBeVisible();
  await page.evaluate(() =>
    window.scrollTo({ top: window.scrollY, behavior: "instant" }),
  );
}
async function ask(page: Page, question: string) {
  await page.getByLabel("What would you like explained?").fill(question);
  await page
    .getByRole("button", { name: "Send question", exact: true })
    .click();
}
const longAnswer =
  "## Many small jobs, done together\n\n" +
  Array.from(
    { length: 18 },
    (_, i) =>
      `### Step ${i + 1}\n\nA **GPU** shares similar calculations across many workers. Each worker handles a different piece of data, and their results are combined. This is an explanation of parallel work.`,
  ).join("\n\n");

test("Desktop teacher formats long answers from the beginning and keeps the composer inside the viewport", async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const response = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/chat", async (route) => {
    await response;
    return route.fulfill({ json: answer(longAnswer) });
  });
  await ask(page, "Explain parallel processing");
  await page.evaluate(() =>
    window.scrollTo({ top: window.scrollY, behavior: "instant" }),
  );
  const top = await page.evaluate(() => window.scrollY);
  release();
  await expect(page.locator(".answer-text h3").first()).toHaveText(
    "Many small jobs, done together",
  );
  await expect(page.locator(".answer-text h3").first()).toBeInViewport();
  const log = page.getByRole("log", { name: "Conversation messages" });
  await expect.poll(() => log.evaluate((node) => node.scrollTop)).toBe(0);
  const font = await page
    .locator(".answer-text")
    .evaluate((node) => getComputedStyle(node).fontSize);
  expect(font).toBe("16px");
  const composer = await page
    .getByLabel("What would you like explained?")
    .boundingBox();
  expect(composer!.y + composer!.height).toBeLessThanOrEqual(1000);
  expect(await page.evaluate(() => window.scrollY)).toBe(top);
  await page.screenshot({
    path: "/tmp/curiosity-teacher-readable.png",
  });
});

test("Expanding and collapsing chat preserves the mounted player, playback position, draft and conversation", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      json: answer("## Shared work\n\nA GPU works on many pixels together."),
    }),
  );
  await ask(page, "What does a GPU do?");
  await page
    .getByLabel("What would you like explained?")
    .fill("My unfinished follow-up");
  await page.evaluate(() => {
    const p = (window as any).mockPlayers.find((p: any) => !p.destroyed);
    p.position = 72;
  });
  const count = await page.evaluate(() => (window as any).mockPlayers.length);
  const playing = await page.evaluate(
    () => (window as any).mockPlayers.find((p: any) => !p.destroyed).playing,
  );
  await page.getByRole("button", { name: "Expand chat", exact: true }).click();
  await expect(page.locator(".desktop-learning-layout")).toHaveClass(
    /chat-expanded/,
  );
  await expect(page.getByLabel("What would you like explained?")).toHaveValue(
    "My unfinished follow-up",
  );
  await expect(page.locator(".answer-text h3")).toHaveText("Shared work");
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(
    page.getByRole("button", { name: "Back to video", exact: true }),
  ).toBeVisible();
  const frame = await page.locator(".player-frame").boundingBox();
  const chat = await page.locator(".desktop-teacher").boundingBox();
  expect(frame!.width).toBeGreaterThanOrEqual(200);
  expect(frame!.x + frame!.width).toBeLessThan(chat!.x);
  await page.screenshot({ path: "/tmp/curiosity-teacher-expanded.png" });
  await page
    .getByRole("button", { name: "Back to video", exact: true })
    .click();
  const state = await page.evaluate(() => {
    const players = (window as any).mockPlayers;
    const active = players.find((p: any) => !p.destroyed);
    return {
      count: players.length,
      position: active.position,
      playing: active.playing,
    };
  });
  expect(state).toEqual({ count, position: 72, playing });
});

test("Suggestion cards show thumbnails and durations, support fallback images and open the existing player", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/chat", (route) =>
    route.fulfill({ json: answer("Try this visual explanation.") }),
  );
  await ask(page, "Suggest another video");
  const card = page.locator(".chat-video-card");
  await expect(card.locator("img")).toHaveAttribute(
    "src",
    /bcdefghijkl\/hqdefault.jpg/,
  );
  await expect(card.locator(".duration-badge")).toHaveText("6:00");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/tmp/curiosity-teacher-suggestions.png",
  });
  await card.locator("img").dispatchEvent("error");
  await expect(card.getByText("YouTube video", { exact: true })).toBeVisible();
  await card
    .getByRole("button", {
      name: `Watch video: ${suggested.title}`,
      exact: true,
    })
    .click();
  await expect(page.getByText(`Mock player ${suggested.id}`)).toBeVisible();
});

test("Reading earlier messages does not jump when another answer arrives", async ({
  page,
}) => {
  await setup(page);
  let calls = 0;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/chat", async (route) => {
    calls++;
    if (calls === 3) await waiting;
    return route.fulfill({
      json: answer(
        calls === 1
          ? longAnswer
          : `## Answer ${calls}\n\nA useful follow-up explanation.`,
      ),
    });
  });
  await ask(page, "First question");
  await expect(page.locator(".chat-turn")).toHaveCount(1);
  await ask(page, "Second question");
  await expect(page.locator(".chat-turn")).toHaveCount(2);
  await ask(page, "Third question");
  const log = page.getByRole("log", { name: "Conversation messages" });
  await log.evaluate((node) => {
    node.scrollTop = 0;
    node.dispatchEvent(new Event("scroll"));
  });
  release();
  await expect(
    page.getByRole("button", { name: "1 new answer ↓" }),
  ).toBeVisible();
  expect(await log.evaluate((node) => node.scrollTop)).toBe(0);
  await page.getByRole("button", { name: "1 new answer ↓" }).click();
  await expect(
    page.getByRole("button", { name: "1 new answer ↓" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("article", {
      name: "Answer to: Third question",
      exact: true,
    }),
  ).toBeInViewport();
});

test("Teacher composer remains usable on a shorter desktop viewport", async ({
  page,
}) => {
  await setup(page, 720);
  await page.route("**/api/chat", (route) =>
    route.fulfill({ json: answer(longAnswer) }),
  );
  await ask(page, "Explain the video");
  await expect(page.locator(".chat-turn")).toHaveCount(1);
  const button = await page
    .getByRole("button", { name: "Send question" })
    .boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(720);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(1440);
});
