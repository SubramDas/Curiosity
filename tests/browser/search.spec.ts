import { test, expect, type Page } from "./test";
import { mockPlayer } from "./player-fixture";

const video = {
  id: "abcdefghijk",
  title: "How GPUs work",
  channel: "Example",
  watchUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  reviewed: false,
  details: { embeddable: true, privacyStatus: "public", duration: "PT6M" },
};
const allow = {
  action: "allow",
  reason: "An educational explanation.",
  choices: [],
};
const choices = {
  action: "choices",
  reason: "Choose a direction. We’ll find videos that explain it.",
  choices: [
    {
      label: "Learn the rules",
      query: "Football rules for beginners",
      description: "Offside, fouls, and how a match works.",
    },
    {
      label: "Understand tactics",
      query: "Football tactics for beginners",
      description: "Formations, positioning, and team strategy.",
    },
  ],
};
const redirect = {
  action: "redirect",
  reason: "Funny videos is mainly entertainment. Try a learning angle instead.",
  choices: [
    {
      label: "Why do we find things funny?",
      query: "The psychology of humor",
      description: "Explore the psychology of humor.",
    },
    {
      label: "Learn to write comedy",
      query: "Learn comedy writing",
      description: "Discover timing, surprise, and storytelling.",
    },
  ],
};
async function setup(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockPlayer(page);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/config")
      return route.fulfill({
        json: { supabaseConfigured: false, videoClassificationEnabled: false },
      });
    if (path === "/api/feed/home")
      return route.fulfill({
        json: { trending: [], recommendations: [], messages: [] },
      });
    if (path === "/api/search/session")
      return route.fulfill({
        json: { permit: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa" },
      });
    return route.fulfill({
      status: 400,
      json: { message: "Unexpected simulated request." },
    });
  });
  await page.route("https://i.ytimg.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#176B4C"/></svg>',
    }),
  );
}
async function submit(page: Page, query: string) {
  await page.getByLabel("Search any topic").fill(query);
  await page.getByRole("button", { name: "Search", exact: true }).click();
}

test("Desktop search opens from the header, offers choices without saving them and shows contextual learning results", async ({
  page,
}) => {
  await setup(page);
  const seen: any[] = [];
  await page.route("**/api/search", (route) => {
    const body = route.request().postDataJSON();
    seen.push(body);
    return route.fulfill({
      json: {
        decision: body.query === "Football" ? choices : allow,
        videos:
          body.query === "Football"
            ? []
            : [{ ...video, title: "Understand football tactics" }],
        nextPageToken: null,
      },
    });
  });
  await page.goto("/");
  await page.getByLabel("Search any topic").focus();
  await expect(
    page.getByRole("heading", { name: "What would you like to learn?" }),
  ).toBeVisible();
  await submit(page, "Football");
  await expect(
    page.getByRole("button", { name: /Understand tactics/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("curiosity-guest-topics-v1") ?? "[]"),
    ),
  ).toEqual([]);
  await page.screenshot({
    path: "/tmp/curiosity-search-desktop-choices.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Understand tactics/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Football tactics for beginners",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Understand football tactics",
      exact: true,
    }),
  ).toBeVisible();
  expect(seen.map((r) => r.query)).toEqual([
    "Football",
    "Football tactics for beginners",
  ]);
  expect(
    seen.every((r) => r.background === true && typeof r.requestId === "string"),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/curiosity-search-desktop-results.png",
    fullPage: true,
  });
});
test("Desktop redirects entertainment and rechecks a real learning goal while preserving the original query", async ({
  page,
}) => {
  await setup(page);
  let refined: any;
  await page.route("**/api/search", (route) => {
    const body = route.request().postDataJSON();
    if (body.goal) refined = body;
    return route.fulfill({
      json: {
        decision: body.goal ? allow : redirect,
        videos: body.goal
          ? [{ ...video, title: "How comedy timing works" }]
          : [],
        nextPageToken: null,
      },
    });
  });
  await page.goto("/");
  await submit(page, "Funny videos");
  await expect(
    page.getByRole("heading", { name: "Let’s find something to learn." }),
  ).toBeVisible();
  await expect(page.locator(".video-card")).toHaveCount(0);
  await page.screenshot({
    path: "/tmp/curiosity-search-desktop-redirect.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "I meant a learning topic" }).click();
  await expect(page.getByLabel("Search any topic")).toHaveValue("Funny videos");
  await page
    .getByLabel("Your learning goal")
    .fill("How do comedians use timing?");
  await page
    .getByRole("button", { name: "Find learning videos", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "How comedy timing works", exact: true }),
  ).toBeVisible();
  expect(refined.query).toBe("Funny videos");
  expect(refined.goal).toBe("How do comedians use timing?");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("curiosity-guest-topics-v1") ?? "[]"),
  );
  expect(saved.map((r: any) => r.query)).toEqual([
    "How do comedians use timing?",
  ]);
});
test("Desktop search polls one job, preserves pagination and opens the existing player without another search", async ({
  page,
}) => {
  await setup(page);
  let searches = 0,
    polls = 0;
  await page.route("**/api/search", (route) => {
    searches++;
    return route.fulfill({
      status: 202,
      json: { jobId: "job-one", status: "checking" },
    });
  });
  await page.route("**/api/search/status", (route) => {
    polls++;
    return route.fulfill({
      json:
        polls === 1
          ? { jobId: "job-one", status: "filtering" }
          : {
              jobId: "job-one",
              status: "ready",
              decision: allow,
              videos: [video],
              nextPageToken: "next",
            },
    });
  });
  await page.goto("/");
  await submit(page, "How GPUs work");
  await expect(
    page.getByRole("heading", { name: "Finding a learning angle…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "How GPUs work", exact: true }),
  ).toBeVisible();
  expect(searches).toBe(1);
  expect(polls).toBe(2);
  await expect(
    page.getByRole("button", { name: "Load more videos" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "How GPUs work", exact: true })
    .click();
  await expect(page.getByText("Mock player abcdefghijk")).toBeVisible();
  expect(searches).toBe(1);
});
test("Desktop failures and empty filtered batches offer recovery without saving a rejected search", async ({
  page,
}) => {
  await setup(page);
  let attempts = 0;
  await page.route("**/api/search", (route) => {
    attempts++;
    return attempts === 1
      ? route.fulfill({
          status: 400,
          json: { message: "Search checking is temporarily unavailable." },
        })
      : route.fulfill({
          json: { decision: allow, videos: [], nextPageToken: "next" },
        });
  });
  await page.goto("/");
  await submit(page, "How GPUs work");
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("No suitable learning videos were found in this batch."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load more videos" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Change search", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What would you like to learn?" }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/curiosity-search-desktop-start.png",
    fullPage: true,
  });
});
test("Desktop navigation cancels pending search presentation and ignores a late result", async ({
  page,
}) => {
  await setup(page);
  let finish!: () => void;
  const waiting = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/search", async (route) => {
    await waiting;
    await route
      .fulfill({
        json: { decision: allow, videos: [video], nextPageToken: null },
      })
      .catch(() => {});
  });
  await page.goto("/");
  await submit(page, "How GPUs work");
  await expect(
    page.getByRole("heading", { name: "Finding a learning angle…" }),
  ).toBeVisible();
  await page
    .locator("#sidebar")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  finish();
  await expect(
    page.getByRole("region", { name: "Learning search" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("curiosity-guest-topics-v1") ?? "[]"),
    ),
  ).toEqual([]);
});

test("Desktop refuses a legacy or malformed response without an educational decision", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos: [video], nextPageToken: null } }),
  );
  await page.goto("/");
  await submit(page, "How GPUs work");
  await expect(page.getByRole("alert")).toContainText("invalid response");
  await expect(page.locator(".video-card")).toHaveCount(0);
});

test("Desktop shows partial results, appends videos during playback and keeps the player mounted", async ({
  page,
}) => {
  await setup(page);
  let complete = false;
  const second = {
    ...video,
    id: "bcdefghijkl",
    title: "Parallel processing explained",
    watchUrl: "https://www.youtube.com/watch?v=bcdefghijkl",
  };
  await page.route("**/api/search", (route) =>
    route.fulfill({
      json: {
        jobId: "progressive",
        status: "filtering",
        decision: allow,
        videos: [video],
        nextPageToken: null,
      },
    }),
  );
  await page.route("**/api/search/status", (route) =>
    route.fulfill({
      json: {
        jobId: "progressive",
        status: complete ? "ready" : "filtering",
        decision: allow,
        videos: complete ? [video, second] : [video],
        nextPageToken: complete ? "next" : null,
      },
    }),
  );
  await page.goto("/");
  await submit(page, "How GPUs work");
  await expect(
    page.getByText("Finding more learning videos… You can start watching now."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load more videos" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "How GPUs work", exact: true })
    .click();
  const player = page.getByText("Mock player abcdefghijk");
  await expect(player).toBeVisible();
  await player.evaluate((node) =>
    node.setAttribute("data-progressive-player", "original"),
  );
  complete = true;
  await expect(
    page.getByRole("button", {
      name: "Parallel processing explained",
      exact: true,
    }),
  ).toBeVisible();
  await expect(player).toHaveAttribute("data-progressive-player", "original");
  await expect(page.getByText("Finding videos…", { exact: true })).toHaveCount(
    0,
  );
});

test("Desktop retains approved partial results when a later check fails", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/api/search", (route) =>
    route.fulfill({
      json: {
        jobId: "partial-fail",
        status: "filtering",
        decision: allow,
        videos: [video],
        nextPageToken: null,
      },
    }),
  );
  await page.route("**/api/search/status", (route) =>
    route.fulfill({
      json: {
        jobId: "partial-fail",
        status: "failed",
        decision: allow,
        videos: [video],
        nextPageToken: null,
        message: "Further checks are unavailable.",
      },
    }),
  );
  await page.goto("/");
  await submit(page, "How GPUs work");
  await expect(page.getByRole("alert")).toContainText(
    "Further checks are unavailable.",
  );
  await expect(
    page.getByRole("button", { name: "How GPUs work", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "We couldn’t finish this search." }),
  ).toHaveCount(0);
});

test("Desktop pagination keeps existing cards visible and deduplicates incremental snapshots", async ({
  page,
}) => {
  await setup(page);
  const second = {
    ...video,
    id: "bcdefghijkl",
    title: "Parallel processing explained",
  };
  const third = { ...video, id: "cdefghijklm", title: "GPU memory explained" };
  let finish = false;
  await page.route("**/api/search", (route) => {
    const body = route.request().postDataJSON();
    return route.fulfill({
      json: body.pageToken
        ? {
            jobId: "page-two",
            status: "filtering",
            decision: allow,
            videos: [video, second],
            nextPageToken: null,
          }
        : { decision: allow, videos: [video], nextPageToken: "next" },
    });
  });
  await page.route("**/api/search/status", (route) =>
    route.fulfill({
      json: {
        jobId: "page-two",
        status: finish ? "ready" : "filtering",
        decision: allow,
        videos: finish ? [video, second, third] : [video, second],
        nextPageToken: null,
      },
    }),
  );
  await page.goto("/");
  await submit(page, "How GPUs work");
  await page.getByRole("button", { name: "Load more videos" }).click();
  await expect(page.locator(".video-card")).toHaveCount(2);
  await expect(
    page.getByText("Finding more learning videos… You can start watching now."),
  ).toBeVisible();
  finish = true;
  await expect(page.locator(".video-card")).toHaveCount(3);
  await expect(page.locator(".video-select-title")).toHaveText([
    "How GPUs work",
    "Parallel processing explained",
    "GPU memory explained",
  ]);
});
