import { ServiceError } from "./providers/request-json.mjs";

// Short-lived provider cache avoids repeating quota-heavy searches on navigation.
export function createHomeFeed({ youtube, reserve, now = Date.now }) {
  const cache = new Map();
  async function cached(key, load, cost = 1) {
    const existing = cache.get(key);
    if (existing && existing.expires > now()) return existing.value;
    for (let request = 0; request < cost; request++) reserve();
    const value = await load();
    cache.set(key, { value, expires: now() + 10 * 60_000 });
    if (cache.size > 50) cache.delete(cache.keys().next().value);
    return value;
  }
  return async function homeFeed(
    queries = [],
    { includeTrending = true } = {},
  ) {
    if (
      !Array.isArray(queries) ||
      queries.length > 2 ||
      queries.some(
        (query) =>
          typeof query !== "string" || !query.trim() || query.length > 480,
      )
    ) {
      throw new ServiceError(
        "INVALID_INPUT",
        "Use up to two recent topic searches.",
      );
    }
    const messages = [];
    let trending = [];
    if (includeTrending)
      try {
        trending = await cached(
          "trending",
          () => youtube.getPopularLearningVideos(),
          2,
        );
      } catch (error) {
        messages.push(
          error instanceof ServiceError &&
            ["LOCAL_LIMIT", "INVALID_CONFIG"].includes(error.code)
            ? error.message
            : "Trending videos could not load. You can still search any topic.",
        );
      }
    const recommendations = [];
    for (const query of [...new Set(queries.map((query) => query.trim()))]) {
      try {
        const videos = await cached(`query:${query}`, async () => {
          const page = await youtube.searchPage(query);
          const details = await youtube.getVideoDetails(
            page.videos.map((video) => video.id),
          );
          return page.videos.map((video) => ({
            ...video,
            details: details.find((detail) => detail.id === video.id) ?? null,
          }));
        });
        recommendations.push({ query, videos });
      } catch (error) {
        messages.push(
          error instanceof ServiceError &&
            ["LOCAL_LIMIT", "INVALID_CONFIG"].includes(error.code)
            ? error.message
            : `Suggestions for “${query}” could not load. Try opening the topic.`,
        );
      }
    }
    return { trending, recommendations, messages: [...new Set(messages)] };
  };
}
