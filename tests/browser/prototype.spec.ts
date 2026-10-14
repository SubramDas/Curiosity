import { mockPlayer } from "./player-fixture";
import { mockAccountProvider } from "./account-fixture";
import { test, expect } from "@playwright/test";
const videos = [
  {
    id: "Kgcfj_KV-mo",
    title: "How GPUs work",
    channel: "Example",
    watchUrl: "https://www.youtube.com/watch?v=Kgcfj_KV-mo",
    reviewed: false,
    details: { embeddable: true, privacyStatus: "public", duration: "PT3M53S" },
  },
];

test.beforeEach(async ({ page }) => {
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: [], recommendations: [], messages: [] },
    }),
  );
});

test("Search pagination preserves grouped guest topics across reload", async ({
  page,
}) => {
  await page.route("**/api/config", (r) =>
    r.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (r) =>
    r.fulfill({ json: { videos, nextPageToken: "next" } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page.getByRole("button", { name: "Load more videos" }).click();
  await expect(page.locator(".video-card")).toHaveCount(1);
  for (const query of ["AMD", "Income tax on GPU imports"]) {
    await page.getByLabel("Search any topic").fill(query);
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page.locator(".video-card")).toHaveCount(1);
  }
  await page.reload();
  await expect(page.getByText(/3 searches explored/)).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("curiosity-guest-topics-v1")!),
  );
  expect(saved.map((s: any) => s.category)).toEqual([
    "money",
    "computing",
    "computing",
  ]);
  expect(saved.map((s: any) => s.key)).toContain("computing:gpu");
});

test("Chat failure is visible, and an offered demo break persists without inventing clips", async ({
  page,
}) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos, nextPageToken: null } }),
  );
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 400,
      json: { message: "The service limit was reached." },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByLabel("What would you like explained?")
    .fill("How does CUDA work?");
  await page.getByRole("button", { name: "Ask →" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The service limit was reached.",
  );
  await page.evaluate(() =>
    localStorage.setItem(
      "curiosity-clock:computing:gpu:demo",
      JSON.stringify({ seconds: 30, offered: true }),
    ),
  );
  await page.getByText("Developer options", { exact: true }).click();
  await page.getByLabel("30-second timer demo").check();
  await expect(
    page.getByRole("heading", { name: "Take a small related break" }),
  ).toBeVisible();
  await expect(page.locator(".break-panel .video-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Find related clips" }).click();
  await expect(page.locator(".break-panel .video-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Return to learning" }).click();
  await expect(
    page.getByRole("heading", { name: "Ask a doubt" }),
  ).toBeVisible();
});

test("Unavailable embedded video offers a clear alternative", async ({
  page,
}) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({
      json: {
        videos: [
          {
            ...videos[0],
            details: { ...videos[0].details, embeddable: false },
          },
        ],
        nextPageToken: null,
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page.getByRole("button", { name: /How GPUs work/ }).click();
  await expect(page.getByRole("alert")).toContainText("not available");
  await expect(
    page.getByRole("link", { name: "Open on YouTube ↗" }),
  ).toBeVisible();
});

test("Long video stays above its result; guest progress survives reload and resumes", async ({
  page,
}) => {
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos, nextPageToken: null } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page.getByRole("button", { name: /How GPUs work/ }).click();
  await expect(page.locator(".video-result .player-section")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers.length))
    .toBe(1);
  await page.waitForTimeout(100);
  await page.evaluate(() => (window as any).mockPlayers[0].pause());
  await expect(
    page
      .getByRole("region", { name: "Continue watching" })
      .getByRole("button", { name: /How GPUs work Continue at 1:12/ }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByRole("region", { name: "Continue watching" })
    .getByRole("button")
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers[0]?.seeks))
    .toEqual([72]);
});

test("Scrolling short videos replaces and stops the previous player", async ({
  page,
}) => {
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({
      json: {
        videos: [
          { ...videos[0], details: { ...videos[0].details, duration: "PT1M" } },
          {
            ...videos[0],
            id: "abcdefghijk",
            title: "Another short",
            details: { ...videos[0].details, duration: "PT2M" },
          },
        ],
        nextPageToken: null,
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByLabel("Video format")
    .getByRole("button", { name: "Short videos", exact: true })
    .click();
  await page.locator(".reel-feed").scrollIntoViewIfNeeded();
  await expect(page.locator(".short-player")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers[0]?.playing))
    .toBe(true);
  await page.locator(".reel-feed").evaluate((element) => {
    element.scrollTop = element.clientHeight;
  });
  await expect(page.locator(".short-player h3")).toHaveText("Another short");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/curiosity-short-feed-mobile.png" });
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers[0]?.destroyed))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).mockPlayers.filter((p: any) => !p.destroyed).length,
      ),
    )
    .toBe(1);
});

test("Account progress loads independently of guest storage and saves the paused position", async ({
  page,
}) => {
  await mockPlayer(page);
  const saved: unknown[] = [];
  await mockAccountProvider(page);
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos, nextPageToken: null } }),
  );
  await page.route("**/api/topics/list", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/topics/save", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/progress/list", (route) =>
    route.fulfill({
      json: [
        {
          video_id: videos[0].id,
          topic_key: "computing:gpu",
          position_seconds: 45,
          duration_seconds: 234,
          completed: false,
        },
      ],
    }),
  );
  await page.route("**/api/progress/save", (route) => {
    saved.push(route.request().postDataJSON());
    return route.fulfill({ json: { saved: true } });
  });
  await page.goto("/");
  await page.locator(".account-panel summary").click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("developer@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByRole("region", { name: "Continue watching" })
    .getByRole("button")
    .click();
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers[0]?.seeks))
    .toEqual([45]);
  await page.evaluate(() => (window as any).mockPlayers[0].pause());
  await expect
    .poll(() =>
      saved.some(
        (row: any) =>
          row.position_seconds === 72 && row.video_id === videos[0].id,
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("curiosity-video-progress-v1"),
    ),
  ).toBeNull();
});

test("Continue watching restores a saved video missing from fresh search results", async ({
  page,
}) => {
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({
      json: {
        videos: [
          { ...videos[0], id: "abcdefghijk", title: "New search result" },
        ],
        nextPageToken: null,
      },
    }),
  );
  await page.route("**/api/videos/details", (route) =>
    route.fulfill({ json: videos }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "curiosity-video-progress-v1",
      JSON.stringify([
        {
          video_id: "Kgcfj_KV-mo",
          topic_key: "computing:gpu",
          position_seconds: 90,
          duration_seconds: 234,
          completed: false,
        },
      ]),
    ),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByRole("region", { name: "Continue watching" })
    .getByRole("button")
    .click();
  await expect(page.locator(".video-result .player-section h3")).toHaveText(
    "How GPUs work",
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers[0]?.seeks))
    .toEqual([90]);
  await page.evaluate(() => (window as any).mockPlayers[0].finish());
  await expect(
    page.getByRole("region", { name: "Continue watching" }),
  ).toHaveCount(0);
  await expect(page.locator(".video-card.selected")).toHaveAttribute(
    "aria-label",
    "How GPUs work Watched",
  );
});

test("Home starts with the three Universes; saved searches survive reload and Home keeps an independent mix", async ({
  page,
}) => {
  const short = {
    ...videos[0],
    id: "abcdefghijk",
    title: "A quick learning idea",
    details: { ...videos[0].details, duration: "PT45S" },
  };
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos, nextPageToken: null } }),
  );
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: [videos[0], short], recommendations: [], messages: [] },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Universes" }).getByRole("button"),
  ).toHaveText([
    "Trending",
    "Science & Technology",
    "Commerce & Business",
    "Arts & Humanities",
  ]);
  await expect(page.locator(".feed-section .video-thumbnail")).toHaveCount(1);
  await expect(
    page
      .getByRole("region", { name: "Shorts", exact: true })
      .locator(".portrait"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page.getByLabel("Search any topic").fill("AMD");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const tabs = page.getByRole("navigation", { name: "Universes" });
  await expect(tabs.getByRole("button")).toHaveText([
    "Trending",
    "Science & Technology",
    "Commerce & Business",
    "Arts & Humanities",
  ]);
  await tabs.getByRole("button", { name: "Trending", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Trending", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Shorts", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "/tmp/curiosity-redesign-home-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await expect(tabs.getByRole("button")).toHaveText([
    "Trending",
    "Science & Technology",
    "Commerce & Business",
    "Arts & Humanities",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("complementary", { name: "Main navigation" }),
  ).toBeVisible();
  const backdrop = page.getByRole("button", {
    name: "Close navigation",
    exact: true,
  });
  const backdropBounds = await backdrop.boundingBox();
  expect(backdropBounds).not.toBeNull();
  // Tap outside the sidebar; the backdrop's center is covered on narrow screens.
  await backdrop.click({ position: { x: backdropBounds!.width - 20, y: 20 } });
  await expect(
    page.getByRole("complementary", { name: "Main navigation" }),
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/curiosity-redesign-home-mobile.png",
    fullPage: true,
  });
});

test("A Trending video plays without creating a searched-topic tab; empty history and home errors offer clear paths", async ({
  page,
}) => {
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      json: { trending: videos, recommendations: [], messages: [] },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "How GPUs work", exact: true })
    .click();
  await expect(page.locator(".video-result .player-section")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Universes" }).getByRole("button"),
  ).toHaveText([
    "Trending",
    "Science & Technology",
    "Commerce & Business",
    "Arts & Humanities",
  ]);
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.evaluate(() =>
    localStorage.removeItem("curiosity-video-progress-v1"),
  );
  await page.reload();
  await page
    .getByRole("complementary", { name: "Main navigation" })
    .getByRole("button", { name: "Continue watching", exact: true })
    .click();
  await expect(
    page.getByText(
      "Your unfinished videos will appear here after you start watching.",
    ),
  ).toBeVisible();
  await page.route("**/api/feed/home", (route) =>
    route.fulfill({
      status: 400,
      json: { message: "Home videos are unavailable." },
    }),
  );
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Home videos are unavailable.",
  );
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Search any topic")).toBeVisible();
});

test("Continue watching reopens a saved player without searching again", async ({
  page,
}) => {
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  let searches = 0;
  await page.route("**/api/search", (route) => {
    searches++;
    return route.fulfill({ json: { videos, nextPageToken: null } });
  });
  await page.route("**/api/videos/details", (route) =>
    route.fulfill({ json: videos }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByRole("button", { name: "How GPUs work", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).mockPlayers.at(-1)?.playing),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Play video", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => (window as any).mockPlayers[0].pause());
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "Continue watching", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Continue watching" })
    .getByRole("button", { name: /^How GPUs work Continue at/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume video", exact: true }),
  ).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers.at(-1).seeks))
    .toEqual([72]);

  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers.at(-1).playing))
    .toBe(true);
  expect(searches).toBe(1);
});

test("Teacher labels unrelated questions, remembers follow-ups, and jumps to a related timestamp", async ({
  page,
}) => {
  await mockPlayer(page);
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos, nextPageToken: null } }),
  );
  const requests: any[] = [];
  await page.route("**/api/chat", (route) => {
    const input = route.request().postDataJSON();
    requests.push(input);
    const related = requests.length > 1;
    return route.fulfill({
      json: {
        answer: related
          ? "The GPU performs parallel work."
          : "Compound interest earns interest on earlier interest.",
        relation: related ? "related" : "unrelated",
        relationReason: related
          ? "The video explains GPU jobs."
          : "This is a finance question.",
        videoContext: "analyzed",
        answerBasis: related ? "video-analysis" : "general",
        sources: [],
        timestamp: related
          ? {
              videoId: videos[0].id,
              startSeconds: 93,
              endSeconds: 110,
              explanation: "GPU parallel work",
              evidence: "A comparison of many workers.",
            }
          : null,
        recommendations: related
          ? []
          : [
              {
                ...videos[0],
                id: "abcdefghijk",
                title: "Compound interest explained",
              },
            ],
        notices: [],
        questionVideo: { id: videos[0].id, title: videos[0].title },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByRole("button", { name: "How GPUs work", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).mockPlayers.at(-1)?.playing),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Play video", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("What would you like explained?")
    .fill("What is compound interest?");
  await page.getByRole("button", { name: "Ask →" }).click();
  await expect(
    page.getByText("This question is not related to that video.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Compound interest explained →" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      (window as any).mockPlayers
        .filter((p: any) => !p.destroyed)
        .map((p: any) => p.id),
    ),
  ).toEqual([videos[0].id]);
  await page
    .getByLabel("What would you like explained?")
    .fill("Now, what does the GPU do?");
  await page.getByRole("button", { name: "Ask →" }).click();
  await page.getByRole("button", { name: "Watch at 1:33" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).mockPlayers.find((p: any) => !p.destroyed).seeks,
      ),
    )
    .toContain(93);
  await page
    .getByRole("button", { name: "Compound interest explained →" })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).mockPlayers.find((p: any) => !p.destroyed)?.id,
      ),
    )
    .toBe("abcdefghijk");
  await page.getByRole("button", { name: "Watch at 1:33" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).mockPlayers.find((p: any) => !p.destroyed)?.id,
      ),
    )
    .toBe(videos[0].id);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).mockPlayers.find((p: any) => !p.destroyed).seeks,
      ),
    )
    .toContain(93);
  expect(requests[0].currentVideo.id).toBe(videos[0].id);
  expect(requests[1].history[0].content).toBe("What is compound interest?");
  await page
    .getByRole("button", { name: "Give me an example", exact: true })
    .click();
  await expect.poll(() => requests.length).toBe(3);
  expect(requests[2].history).toHaveLength(4);
});

test("Teacher conversation clears on sign-out and cannot restore a late private answer", async ({
  page,
}) => {
  await mockAccountProvider(page);
  await page.route("**/api/search", (route) =>
    route.fulfill({ json: { videos, nextPageToken: null } }),
  );
  await page.route("**/api/topics/save", (route) =>
    route.fulfill({ json: [] }),
  );
  let release: (() => void) | undefined;
  await page.route("**/api/chat", async (route) => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({
      json: {
        answer: "Private answer",
        relation: "no-video",
        relationReason: "",
        sources: [],
        recommendations: [],
        notices: [],
        timestamp: null,
        questionVideo: null,
        answerBasis: "general",
        videoContext: "none",
      },
    });
  });
  await page.goto("/");
  await page.locator(".account-panel summary").click();
  await page
    .getByLabel("Email", { exact: true })
    .fill("developer@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByLabel("What would you like explained?")
    .fill("A private question");
  await page.getByRole("button", { name: "Ask →" }).click();
  await expect.poll(() => Boolean(release)).toBe(true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  release!();
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await expect(page.getByText("Private answer", { exact: true })).toHaveCount(
    0,
  );
});

test("Teacher is available before searching or selecting a video", async ({
  page,
}) => {
  await page.route("**/api/config", (route) =>
    route.fulfill({ json: { supabaseConfigured: false } }),
  );
  let searches = 0;
  await page.route("**/api/search", (route) => {
    searches++;
    return route.fulfill({ json: { videos: [] } });
  });
  await page.route("**/api/chat", (route) => {
    expect(route.request().postDataJSON().currentVideo).toBeNull();
    return route.fulfill({
      json: {
        answer: "Interest earns more interest.",
        relation: "no-video",
        relationReason: "",
        sources: [],
        recommendations: [],
        notices: [],
        timestamp: null,
        questionVideo: null,
        answerBasis: "general",
        videoContext: "none",
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ask a question", exact: true })
    .click();
  await page
    .getByLabel("What would you like explained?")
    .fill("Explain compound interest");
  await page.getByRole("button", { name: "Ask →" }).click();
  await expect(
    page.getByText("Interest earns more interest.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No videos returned. Try a clearer search.", {
      exact: true,
    }),
  ).toHaveCount(0);
  expect(searches).toBe(0);
  await page.screenshot({
    path: "/tmp/curiosity-teacher-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/curiosity-teacher-mobile.png",
    fullPage: true,
  });
});
