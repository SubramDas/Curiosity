import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readYouTubeSearchPageSize } from "../backend/providers/youtube-settings.mjs";
import { createYouTubeClient } from "../backend/providers/youtube.mjs";
import { createCachedYouTubeClient } from "../backend/cached-youtube.mjs";
import { createProviderCache } from "../backend/provider-cache.mjs";
import { createVideoFilter } from "../backend/search/video-filter.mjs";
import { startServer } from "../backend/server.mjs";
import { educationalSearchAssessor } from "./search-fixture";

const videos = Array.from({ length: 20 }, (_, i) => ({
  id: `abcdefghi${String(i).padStart(2, "0")}`,
  title: `Explanation ${i}`,
  channel: "Example",
  reviewed: false,
  watchUrl: `https://www.youtube.com/watch?v=abcdefghi${String(i).padStart(2, "0")}`,
  details: { embeddable: true, privacyStatus: "public", duration: "PT6M" },
}));

test("Search page size defaults to ten and rejects invalid or unsupported values", () => {
  assert.equal(readYouTubeSearchPageSize(), 10);
  for (const size of [1, 3, 20])
    assert.equal(readYouTubeSearchPageSize(String(size)), size);
  for (const value of ["", "bad", "0", "21", "2.5", -1, Infinity])
    assert.throws(
      () => readYouTubeSearchPageSize(value as any),
      /YOUTUBE_SEARCH_PAGE_SIZE/,
    );
});

test("YouTube receives the configured page size on initial and paginated searches", async () => {
  const requests: URL[] = [];
  const youtube = createYouTubeClient({
    apiKey: "test-only",
    searchPageSize: 3,
    fetchRequest: async (url: any) => {
      requests.push(new URL(url));
      return Response.json({ items: [], nextPageToken: "next" });
    },
  });
  await youtube.searchPage("GPU");
  await youtube.searchPage("GPU", "next");
  assert.deepEqual(
    requests.map((url) => url.searchParams.get("maxResults")),
    ["3", "3"],
  );
  assert.equal(requests[1].searchParams.get("pageToken"), "next");
});

test("Changing page size separates cached pages while retaining cached video details", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-page-size-cache-"));
  try {
    const cache = createProviderCache({ directory });
    let searches = 0,
      details = 0;
    const client = (searchPageSize: number) =>
      createCachedYouTubeClient({
        cache,
        searchPageSize,
        reserve: () => {},
        youtube: {
          searchPage: async () => {
            searches++;
            return {
              videos: videos.slice(0, searchPageSize),
              nextPageToken: "next",
            };
          },
          getPlayableVideos: async () => {
            details++;
            return [videos[0]];
          },
        },
      });
    const large = client(10),
      small = client(3);
    assert.equal((await large.searchPage("GPU")).videos.length, 10);
    await large.getPlayableVideos([videos[0].id]);
    assert.equal((await small.searchPage("GPU")).videos.length, 3);
    await small.getPlayableVideos([videos[0].id]);
    await small.searchPage("GPU");
    assert.equal(searches, 2);
    assert.equal(details, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Guardrail filtering respects configured candidate counts, including sizes above ten", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-page-size-filter-"));
  try {
    const cache = createProviderCache({ directory });
    let assessed = 0;
    const assessor = {
      videos: async (rows: any[]) => {
        assessed += rows.length;
        return rows.map((row) => ({
          id: row.id,
          purpose: "educational",
          related: true,
        }));
      },
    };
    const small = createVideoFilter({
      cache,
      assessor,
      model: "test",
      searchPageSize: 3,
    });
    assert.equal((await small(videos)).length, 3);
    assert.equal(assessed, 3);
    const large = createVideoFilter({
      cache,
      assessor,
      model: "test",
      searchPageSize: 20,
    });
    assert.equal((await large(videos)).length, 20);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("Server wires the environment page size into search filtering", async () => {
  const directory = mkdtempSync(join(tmpdir(), "curiosity-page-size-http-"));
  const server = startServer(
    { YOUTUBE_SEARCH_PAGE_SIZE: "3" },
    {
      port: 0,
      usageDirectory: directory,
      searchAssessor: educationalSearchAssessor,
      youtube: {
        searchPage: async () => ({
          videos: videos.slice(0, 5),
          nextPageToken: "next",
        }),
        getPlayableVideos: async () => videos.slice(0, 5),
      } as any,
    },
  );
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${(server.address() as any).port}/api/search`,
      {
        method: "POST",
        headers: {
          Origin: "http://127.0.0.1:5173",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "How GPUs work" }),
      },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.videos.length, 3);
    assert.equal(body.nextPageToken, "next");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(directory, { recursive: true, force: true });
  }
});
