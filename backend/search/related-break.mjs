import { randomUUID } from "node:crypto";
import { ServiceError } from "../providers/request-json.mjs";
import { searchText } from "./search-policy.mjs";

export function createRelatedBreak({
  guard,
  filter,
  youtube,
  cache,
  allowDemo,
  now,
}) {
  const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
  const fail = (message) => {
    throw new ServiceError("INVALID_INPUT", message);
  };
  async function session({ query, videoId, demo = false }) {
    const startedAt = now();
    if (videoId) {
      if (typeof videoId !== "string" || !/^[\w-]{11}$/.test(videoId))
        fail("Use a valid video identifier.");
      const videos = await youtube().getPlayableVideos([videoId]);
      const [video] = await filter(videos);
      if (!video)
        throw new ServiceError(
          "SEARCH_RESTRICTED",
          "Related breaks need an educational video first.",
        );
      query = video.title.slice(0, 480);
    } else {
      query = searchText(query);
      if ((await guard(query)).action !== "allow")
        throw new ServiceError(
          "SEARCH_RESTRICTED",
          "Choose a learning topic before taking a related break.",
        );
    }
    const permit = randomUUID();
    await cache.getOrLoad(
      ["related-break-session", permit],
      6 * 3600_000,
      async () => ({
        query,
        availableAt:
          startedAt + (demo === true && allowDemo ? 30_000 : 720_000),
      }),
    );
    return { permit };
  }
  async function load(body) {
    if (typeof body.permit !== "string" || !uuid.test(body.permit))
      fail("A related break needs its learning session.");
    const record = await cache.getOrLoad(
      ["related-break-session", body.permit],
      6 * 3600_000,
      async () => {
        throw new ServiceError(
          "BREAK_EXPIRED",
          "This break session expired. Continue learning to start another.",
        );
      },
    );
    if (now() < record.availableAt)
      throw new ServiceError(
        "BREAK_NOT_READY",
        "Your related break is not ready yet. Continue learning.",
      );
    return cache.getOrLoad(
      ["related-break-results", body.permit],
      6 * 3600_000,
      async () => {
        const page = await youtube().searchPage(
          `${record.query.slice(0, 400)} funny creative demonstration`,
        );
        const videos = await youtube().getPlayableVideos(
          page.videos.map((v) => v.id),
        );
        return {
          videos: (
            await filter(videos, { purpose: "break", topic: record.query })
          ).slice(0, 3),
          nextPageToken: null,
        };
      },
    );
  }

  return { session, load };
}
