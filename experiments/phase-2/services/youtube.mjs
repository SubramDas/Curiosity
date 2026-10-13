import { requestJson, ServiceError } from "./request-json.mjs";

const API_ROOT = "https://www.googleapis.com/youtube/v3/";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function createYouTubeClient({ apiKey, fetchRequest = fetch }) {
  if (!apiKey?.trim())
    throw new ServiceError("MISSING_CONFIG", "Set YOUTUBE_API_KEY in .env.");

  async function callApi(path, parameters) {
    const url = new URL(path, API_ROOT);
    url.search = new URLSearchParams(parameters).toString();
    return requestJson(
      url,
      { headers: { "x-goog-api-key": apiKey } },
      fetchRequest,
    );
  }

  return {
    async getPopularLearningVideos() {
      // "Trending" is our recent popular learning feed, not YouTube's chart.
      const publishedAfter = new Date(
        Date.now() - 30 * 86400_000,
      ).toISOString();
      const parameters = {
        part: "snippet",
        type: "video",
        q: "science explained|technology explained|finance explained",
        videoCategoryId: "27",
        order: "viewCount",
        publishedAfter,
        regionCode: "IN",
        relevanceLanguage: "en",
        safeSearch: "moderate",
        videoEmbeddable: "true",
        maxResults: "10",
      };
      // Separate batches keep short clips from displacing all regular videos.
      const batches = await Promise.all(
        ["medium", "short"].map((videoDuration) =>
          callApi("search", { ...parameters, videoDuration }),
        ),
      );
      if (batches.some((data) => !Array.isArray(data.items)))
        throw new ServiceError(
          "INVALID_RESPONSE",
          "YouTube did not return popular videos.",
        );
      const ids = [
        ...new Set(
          batches
            .flatMap((data) => data.items.map((item) => item.id?.videoId))
            .filter((id) => VIDEO_ID.test(id ?? "")),
        ),
      ];
      const details = await this.getPlayableVideos(ids);
      return ids.flatMap((id) => {
        const video = details.find((video) => video.id === id);
        return video?.details.embeddable ? [video] : [];
      });
    },
    async searchPage(query, pageToken) {
      if (typeof query !== "string" || !query.trim() || query.length > 500) {
        throw new ServiceError(
          "INVALID_INPUT",
          "Search text must contain between 1 and 500 characters.",
        );
      }
      const parameters = {
        part: "snippet",
        type: "video",
        q: query.trim(),
        maxResults: "10",
        videoEmbeddable: "true",
        regionCode: "IN",
        relevanceLanguage: "en",
        safeSearch: "moderate",
        order: "relevance",
      };
      if (pageToken) parameters.pageToken = pageToken;
      const data = await callApi("search", parameters);
      if (!Array.isArray(data.items))
        throw new ServiceError(
          "INVALID_RESPONSE",
          "YouTube did not return a results list.",
        );

      return {
        videos: data.items.flatMap((item) => {
          const id = item.id?.videoId;
          if (
            !VIDEO_ID.test(id ?? "") ||
            typeof item.snippet?.title !== "string"
          )
            return [];
          return [
            {
              id,
              title: item.snippet.title,
              channel: item.snippet.channelTitle ?? "",
              watchUrl: `https://www.youtube.com/watch?v=${id}`,
              reviewed: false,
            },
          ];
        }),
        nextPageToken:
          typeof data.nextPageToken === "string" ? data.nextPageToken : null,
      };
    },

    async getPlayableVideos(videoIds) {
      const ids = [...new Set(videoIds)];
      if (!ids.length) return [];
      if (ids.length > 20 || ids.some((id) => !VIDEO_ID.test(id)))
        throw new ServiceError(
          "INVALID_INPUT",
          "Use up to 20 valid video identifiers.",
        );
      const data = await callApi("videos", {
        part: "snippet,contentDetails,status",
        id: ids.join(","),
      });
      if (!Array.isArray(data.items))
        throw new ServiceError(
          "INVALID_RESPONSE",
          "YouTube did not return video details.",
        );
      return data.items
        .filter(
          (item) =>
            ids.includes(item.id) && typeof item.snippet?.title === "string",
        )
        .map((item) => ({
          id: item.id,
          title: item.snippet.title,
          channel: item.snippet.channelTitle ?? "",
          watchUrl: `https://www.youtube.com/watch?v=${item.id}`,
          reviewed: false,
          details: {
            duration: item.contentDetails?.duration ?? null,
            embeddable: item.status?.embeddable === true,
            privacyStatus: item.status?.privacyStatus ?? "unknown",
          },
        }));
    },
    async getVideoDetails(videoIds) {
      const ids = [...new Set(videoIds)];
      if (!ids.length) return [];
      if (ids.length > 50 || ids.some((id) => !VIDEO_ID.test(id))) {
        throw new ServiceError(
          "INVALID_INPUT",
          "Video details require up to 50 valid YouTube identifiers.",
        );
      }
      const data = await callApi("videos", {
        part: "snippet,contentDetails,status",
        id: ids.join(","),
      });
      if (!Array.isArray(data.items))
        throw new ServiceError(
          "INVALID_RESPONSE",
          "YouTube did not return video details.",
        );
      return data.items
        .filter((item) => ids.includes(item.id))
        .map((item) => ({
          id: item.id,
          duration: item.contentDetails?.duration ?? null,
          embeddable: item.status?.embeddable === true,
          privacyStatus: item.status?.privacyStatus ?? "unknown",
        }));
    },
  };
}

export function mergeVideoPages(pages) {
  const uniqueVideos = new Map();
  for (const page of pages) {
    for (const video of page.videos) {
      if (!uniqueVideos.has(video.id)) uniqueVideos.set(video.id, video);
    }
  }
  return [...uniqueVideos.values()];
}
