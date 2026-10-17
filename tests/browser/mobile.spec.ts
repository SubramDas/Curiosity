import { test, expect, type Page } from "./test";
import { mockPlayer } from "./player-fixture";
import { mockAccountProvider } from "./account-fixture";

const longVideo = {
  id: "Kgcfj_KV-mo",
  title: "How GPUs work",
  channel: "Example",
  watchUrl: "https://www.youtube.com/watch?v=Kgcfj_KV-mo",
  reviewed: false,
  details: { embeddable: true, privacyStatus: "public", duration: "PT6M24S" },
};
const shorts = [0, 1].map((i) => ({
  ...longVideo,
  id: i ? "lmnopqrstuv" : "abcdefghijk",
  title: i ? "Another GPU Short" : "A quick GPU explanation",
  details: { ...longVideo.details, duration: "PT45S" },
}));
async function setup(page: Page) {
  await mockPlayer(page);
  await page.route("**/api/search/break", (r) =>
    r.fulfill({
      json: {
        decision: {
          action: "allow",
          reason: "Simulated learning request.",
          choices: [],
        },
        videos: [longVideo, ...shorts],
        nextPageToken: null,
      },
    }),
  );
  await page.route("**/api/config", (r) =>
    r.fulfill({ json: { supabaseConfigured: false } }),
  );
  await page.route("**/api/feed/home", (r) =>
    r.fulfill({
      json: {
        trending: [longVideo, ...shorts],
        recommendations: [],
        messages: [],
      },
    }),
  );
  await page.route("**/api/search", (r) =>
    r.fulfill({
      json: {
        decision: {
          action: "allow",
          reason: "Simulated learning request.",
          choices: [],
        },
        videos: [longVideo, ...shorts],
        nextPageToken: null,
      },
    }),
  );
  await page.route("**/api/videos/details", (r) =>
    r.fulfill({ json: [longVideo, ...shorts] }),
  );
  await page.route("https://i.ytimg.com/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#176b4c"/><text x="40" y="180" fill="white" font-size="36">Learning video</text></svg>',
    }),
  );
}

for (const width of [320, 360, 390, 430])
  test(`Mobile ${width}px: search, grouped topics, navigation and readable feed`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await setup(page);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(nav).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Follow your curiosity." }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Search anything", exact: true })
      .click();
    await page.getByLabel("Search any topic").fill("GPUs");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "How GPUs work", exact: true }),
    ).toBeVisible();
    await nav.getByRole("button", { name: "Topics", exact: true }).click();
    await page.getByRole("button", { name: /Computing & Tech/ }).click();
    await page.getByRole("button", { name: "GPUs", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "How GPUs work", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await page.screenshot({
      path: `/tmp/curiosity-mobile-${width}.png`,
      fullPage: true,
    });
  });

test("Mobile teacher preserves video context, pauses hidden playback and returns to timestamps above the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: Object.assign(new EventTarget(), { height: 844, offsetTop: 0 }),
    });
  });
  await setup(page);
  const requests: any[] = [];
  await page.route("**/api/chat", (r) => {
    const input = r.request().postDataJSON();
    requests.push(input);
    return r.fulfill({
      json: {
        answer: "GPUs perform many tasks in parallel.",
        relation: "related",
        relationReason: "This video explains GPU work.",
        videoContext: "analyzed",
        answerBasis: "video-analysis",
        sources: [],
        recommendations: [],
        notices: [],
        questionVideo: { id: longVideo.id, title: longVideo.title },
        timestamp: {
          videoId: longVideo.id,
          startSeconds: 37,
          endSeconds: 43,
          explanation: "Parallel GPU work",
          evidence: "A group of workers.",
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await page
    .getByRole("button", { name: "How GPUs work", exact: true })
    .click();
  await page.getByRole("button", { name: "Play video", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Ask", exact: true })
    .click();
  await expect(page.locator(".mobile-video-context")).toContainText(
    longVideo.title,
  );
  await expect
    .poll(() => page.evaluate(() => (window as any).mockPlayers[0].playing))
    .toBe(false);
  await page
    .getByLabel("What would you like explained?")
    .fill("What does a GPU do?");
  await page.getByRole("button", { name: "Ask →", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Watch at 0:37" }),
  ).toBeVisible();
  expect(requests[0].currentVideo.id).toBe(longVideo.id);
  await page.screenshot({ path: "/tmp/curiosity-mobile-chat.png" });
  await page.getByRole("button", { name: "Watch at 0:37" }).click();
  await expect(page.locator(".mobile-learning-feed")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).mockPlayers.find((p: any) => !p.destroyed).seeks,
      ),
    )
    .toContain(37);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Ask", exact: true })
    .click();
  await page.getByLabel("What would you like explained?").focus();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", {
      configurable: true,
      value: 420,
    });
    window.visualViewport?.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator(".mobile-app")).toHaveClass(/keyboard-open/);
  const form = await page.locator(".mobile-chat-screen form").boundingBox();
  expect(form!.y + form!.height).toBeLessThanOrEqual(421);
  await page.screenshot({ path: "/tmp/curiosity-mobile-keyboard.png" });
});

test("Mobile Shorts navigation keeps one player and a question uses the active Short", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.route("**/api/chat", (r) => {
    expect(r.request().postDataJSON().currentVideo.id).toBe(shorts[1].id);
    return r.fulfill({
      json: {
        answer: "A related answer.",
        relation: "related",
        relationReason: "",
        videoContext: "title-only",
        answerBasis: "general",
        sources: [],
        timestamp: null,
        recommendations: [],
        notices: [],
        questionVideo: { id: shorts[1].id, title: shorts[1].title },
      },
    });
  });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await nav.getByRole("button", { name: "Shorts", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const player = (window as any).mockPlayers.find(
          (p: any) => !p.destroyed,
        );
        return player && { playing: player.playing, muted: player.muted };
      }),
    )
    .toEqual({ playing: true, muted: false });
  await page.evaluate(() => {
    (window as any).mockPlayers.find((p: any) => !p.destroyed).blockAutoplay();
  });
  await page
    .getByRole("button", { name: "Play with sound", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play with sound", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next Short", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const player = (window as any).mockPlayers.find(
          (p: any) => !p.destroyed,
        );
        return player && { playing: player.playing, muted: player.muted };
      }),
    )
    .toEqual({ playing: true, muted: false });
  await expect(page.locator(".short-player h3")).toHaveText(shorts[1].title);
  await nav.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByLabel("What would you like explained?").fill("Explain this");
  await page.getByRole("button", { name: "Ask →", exact: true }).click();
  await expect(
    page.getByText("A related answer.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to videos", exact: true })
    .click();
  await expect(page.locator(".short-player h3")).toHaveText(shorts[1].title);
  expect(
    await page.evaluate(
      () => (window as any).mockPlayers.filter((p: any) => !p.destroyed).length,
    ),
  ).toBe(1);
  await page.screenshot({ path: "/tmp/curiosity-mobile-shorts.png" });
});

test("Mobile account screen supports sign-in, sign-out, guest isolation and close", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await setup(page);
  await mockAccountProvider(page);
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
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Close account", exact: false })
    .click();
  await expect(page.locator(".account-dropdown")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Mobile standalone teacher, saved playback and landscape remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "curiosity-video-progress-v1",
      JSON.stringify([
        {
          video_id: "Kgcfj_KV-mo",
          topic_key: "computing:gpu",
          position_seconds: 72,
          duration_seconds: 234,
          completed: false,
        },
      ]),
    ),
  );
  await page.route("**/api/chat", (r) => {
    expect(r.request().postDataJSON().currentVideo).toBeNull();
    return r.fulfill({
      json: {
        answer: "Let’s explore this topic.",
        relation: "no-video",
        relationReason: "",
        videoContext: "none",
        answerBasis: "general",
        sources: [],
        timestamp: null,
        recommendations: [],
        notices: [],
        questionVideo: null,
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Ask", exact: true })
    .click();
  await page.getByLabel("What would you like explained?").fill("Explain stars");
  await page.getByRole("button", { name: "Ask →", exact: true }).click();
  await expect(
    page.getByText("Let’s explore this topic.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page
    .getByRole("region", { name: "Continue watching" })
    .getByRole("button", { name: /How GPUs work/ })
    .click();
  await expect(
    page.getByRole("button", { name: "Resume video", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as any).mockPlayers.find((p: any) => !p.destroyed).seeks,
      ),
    )
    .toContain(72);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect
    .poll(async () => {
      const bounds = await page.locator(".player-frame").boundingBox();
      return (
        bounds !== null && bounds.y >= 64 && bounds.y + bounds.height <= 327
      );
    })
    .toBe(true);
  await page.screenshot({ path: "/tmp/curiosity-mobile-landscape.png" });
});

test("Mobile break stays optional, caps candidates at three and search errors offer a path back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await setup(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      "curiosity-clock:computing:gpu:real",
      JSON.stringify({ seconds: 720, offered: true }),
    ),
  );
  await page.route("**/api/search", (r) =>
    r.fulfill({
      json: {
        decision: {
          action: "allow",
          reason: "Simulated learning request.",
          choices: [],
        },
        videos: [
          longVideo,
          ...shorts,
          { ...longVideo, id: "zyxwvutsrqp", title: "Fourth candidate" },
        ],
        nextPageToken: null,
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "GPUs", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Learning break" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Find related clips", exact: true })
    .click();
  await expect(page.locator(".break-panel .video-card")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Return to learning", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Learning break" }),
  ).toHaveCount(0);
  await page.route("**/api/search", (r) =>
    r.fulfill({
      status: 400,
      json: {
        message:
          "The local daily search allowance is used. Try again tomorrow.",
      },
    }),
  );
  await page.getByRole("button", { name: "Open search", exact: true }).click();
  await page.getByLabel("Search any topic").fill("Income tax");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("daily search allowance");
  await page
    .getByRole("button", { name: "Change search", exact: true })
    .click();
  await expect(page.getByLabel("Search any topic")).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`Shorts at ${width}px hide the resume row and still resume from Continue watching`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await page.addInitScript(() =>
      localStorage.setItem(
        "curiosity-video-progress-v1",
        JSON.stringify([
          {
            video_id: "abcdefghijk",
            topic_key: "computing:gpu",
            position_seconds: 20,
            duration_seconds: 45,
            completed: false,
          },
        ]),
      ),
    );
    await page.goto("/");
    if (width < 768)
      await page
        .getByRole("button", { name: "Toggle navigation", exact: true })
        .click();
    await page
      .getByRole("button", {
        name: width < 768 ? "Continue watching" : "Watch history",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: width < 768 ? "Continue watching" : "Watch history",
        exact: true,
        level: 1,
      }),
    ).toBeVisible();
    await page
      .getByRole("region", {
        name: width < 768 ? "Continue watching" : "Watch history",
      })
      .getByRole("button", {
        name:
          width < 768
            ? /A quick GPU explanation/
            : /^Resume.*A quick GPU explanation/,
      })
      .last()
      .click();
    await expect(page.locator(".short-player h3")).toHaveText(shorts[0].title);
    await expect(
      page.getByRole("region", { name: "Continue watching" }),
    ).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as any).mockPlayers.find((p: any) => !p.destroyed)?.seeks,
        ),
      )
      .toContain(20);
    await page
      .getByLabel("Video format")
      .getByRole("button", { name: "All videos", exact: true })
      .click();
    if (width < 768) {
      await expect(
        page.getByRole("region", { name: "Continue watching" }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("region", { name: "Continue watching" }),
      ).toHaveCount(0);
    }
    await page
      .getByLabel("Video format")
      .getByRole("button", { name: "Short videos", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Continue watching" }),
    ).toHaveCount(0);
  });
}
