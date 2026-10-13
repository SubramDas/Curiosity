import { useRef, useState } from "react";
import { callApi } from "../../lib/api";
import type { Topic, Video, VideoPage } from "../../types";

export function useVideoSearch() {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function load(nextTopic: Topic, append = false): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError("");
    if (!append) {
      setTopic(nextTopic);
      setVideos([]);
      setNextPage(null);
    }
    try {
      const page = await callApi<VideoPage>("search", {
        query: nextTopic.query,
        ...(append ? { pageToken: nextPage } : {}),
      });
      setVideos((current) => {
        const combined = append ? [...current, ...page.videos] : page.videos;
        return [
          ...new Map(combined.map((video) => [video.id, video])).values(),
        ];
      });
      setNextPage(page.nextPageToken);
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Search failed.");
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { topic, videos, nextPage, busy, error, load };
}
