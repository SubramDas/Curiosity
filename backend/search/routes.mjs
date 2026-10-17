import { ServiceError } from "../providers/request-json.mjs";
import { searchText } from "./search-policy.mjs";
import { createRelatedBreak } from "./related-break.mjs";
import { createSearchJobs } from "./search-jobs.mjs";

export function createSearchRoutes({
  guard,
  filter,
  youtube,
  cache,
  onApproved = async () => {},
  allowDemo = false,
  now = Date.now,
}) {
  const fail = (message) => {
    throw new ServiceError("INVALID_INPUT", message);
  };
  const breaks = createRelatedBreak({
    guard,
    filter,
    youtube,
    cache,
    allowDemo,
    now,
  });
  async function run(body, onPhase = () => {}, onProgress) {
    const query = searchText(body.query),
      goal = searchText(body.goal, 480, true);
    if (
      body.pageToken !== undefined &&
      (typeof body.pageToken !== "string" ||
        !body.pageToken ||
        body.pageToken.length > 500)
    )
      fail("The page token is invalid.");
    const decision = await guard(query, goal);
    if (decision.action !== "allow")
      return { decision, videos: [], nextPageToken: null };
    onPhase("filtering");
    const page = await youtube().searchPage(goal || query, body.pageToken);
    // Hydrate server-owned metadata; never trust browser titles or labels.
    const hydrated = await youtube().getPlayableVideos(
      page.videos.map((v) => v.id),
    );
    const byId = new Map(hydrated.map((v) => [v.id, v]));
    const videos = await filter(
      page.videos.flatMap((v) => (byId.has(v.id) ? [byId.get(v.id)] : [])),
      onProgress
        ? {
            onProgress: async (videos) => {
              await onApproved(videos);
              onProgress({ decision, videos, nextPageToken: null });
            },
          }
        : {},
    );
    if (!onProgress) await onApproved(videos);
    return {
      decision,
      videos,
      nextPageToken: page.nextPageToken ?? null,
      filteredCount: page.videos.length - videos.length,
    };
  }

  const jobs = createSearchJobs({ run, now });
  return async (path, body) => {
    if (!body || typeof body !== "object" || Array.isArray(body))
      fail("Send a search request.");
    if (path === "/api/search/session") return breaks.session(body);
    if (path === "/api/search/break") return breaks.load(body);
    if (path === "/api/search/status") return jobs.status(body);
    if (path !== "/api/search")
      throw new ServiceError("NOT_FOUND", "This search action is unavailable.");
    searchText(body.query);
    searchText(body.goal, 480, true);
    return body.background === true ? jobs.request(body) : run(body);
  };
}
