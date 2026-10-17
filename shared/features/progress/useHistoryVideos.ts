import { useEffect, useState } from "react";
import type { Video } from "../../types";
import { callApi } from "../../lib/api";
import type { VideoProgress } from "./useVideoProgress";

// History loads at most 20 rows at a time, matching the video-details API limit.
export function useHistoryVideos(rows: VideoProgress[], known: Video[]) {
  const missing = rows
    .filter((row) => !known.some((video) => video.id === row.video_id))
    .map((row) => row.video_id)
    .sort()
    .join(",");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    videos: Video[];
    loading: boolean;
    failed: boolean;
  }>({ key: "", videos: [], loading: false, failed: false });
  useEffect(() => {
    if (!missing) return;
    let cancelled = false;
    setResult({ key: missing, videos: [], loading: true, failed: false });
    callApi<Video[]>("videos/details", { ids: missing.split(",") })
      .then((videos) => {
        if (
          !Array.isArray(videos) ||
          videos.some(
            (video) =>
              !video ||
              !/^[A-Za-z0-9_-]{11}$/.test(video.id) ||
              typeof video.title !== "string" ||
              typeof video.channel !== "string" ||
              typeof video.watchUrl !== "string" ||
              (video.details !== null &&
                (!video.details ||
                  typeof video.details.embeddable !== "boolean" ||
                  (video.details.duration !== null &&
                    typeof video.details.duration !== "string"))),
          )
        )
          throw new Error("Invalid video details");
        if (!cancelled)
          setResult({ key: missing, videos, loading: false, failed: false });
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: missing, videos: [], loading: false, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [missing, retry]);
  const current = result.key === missing ? result : null;
  return {
    videos: [...known, ...(current?.videos ?? [])],
    loading: Boolean(missing && (!current || current.loading)),
    failed: Boolean(missing && current?.failed),
    retry: () => setRetry((value) => value + 1),
  };
}
