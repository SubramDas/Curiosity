const SEARCH_TTL = 6 * 3600_000;
const DETAILS_TTL = 6 * 3600_000;
const TRENDING_TTL = 3600_000;

export function createCachedYouTubeClient({ youtube, cache, reserve }) {
  // Include settings/version so a change in search policy cannot reuse old results.
  const settings = "v2:IN:en:moderate:embeddable:relevance:10:metadata";
  const searchPage = (query, pageToken) =>
    cache.getOrLoad(
      ["search", settings, query.trim(), pageToken ?? ""],
      SEARCH_TTL,
      async () => {
        await reserve(1);
        return youtube.searchPage(query, pageToken);
      },
    );
  async function getPlayableVideos(ids) {
    if (!ids.length) return [];
    // Cache individual videos: a different requested batch still reuses details.
    let batch = [];
    let timer;
    function queueVideo(id) {
      return new Promise((resolve, reject) => {
        batch.push({ id, resolve, reject });
        if (timer) return;
        // Shared-store lookups finish asynchronously; later misses need their own batch.
        timer = setTimeout(async () => {
          const current = batch;
          batch = [];
          timer = undefined;
          try {
            await reserve(1);
            const videos = await youtube.getPlayableVideos(
              current.map((row) => row.id),
            );
            for (const row of current)
              row.resolve(videos.find((video) => video.id === row.id) ?? null);
          } catch (error) {
            for (const row of current) row.reject(error);
          }
        }, 20);
      });
    }
    const rows = await Promise.all(
      [...new Set(ids)].map((id) =>
        cache.getOrLoad(["video", settings, id], DETAILS_TTL, () =>
          queueVideo(id),
        ),
      ),
    );
    return rows.filter(Boolean);
  }
  return {
    searchPage,
    getPlayableVideos,
    async getVideoDetails(ids) {
      return (await getPlayableVideos(ids)).map((video) => ({
        id: video.id,
        ...video.details,
      }));
    },
    async getPopularLearningVideos() {
      return cache.getOrLoad(
        ["trending", settings, "medium+short:30days"],
        TRENDING_TTL,
        async () => {
          await reserve(2);
          const videos = await youtube.getPopularLearningVideos();
          await Promise.all(
            videos.map((video) =>
              cache.getOrLoad(
                ["video", settings, video.id],
                DETAILS_TTL,
                async () => video,
              ),
            ),
          );
          return videos;
        },
      );
    },
  };
}
