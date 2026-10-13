import { useEffect, useState } from "react";
import { callApi } from "../../lib/api";
import type { Topic, Video } from "../../types";
export interface HomeFeedData {
  trending: Video[];
  recommendations: { query: string; videos: Video[] }[];
  messages: string[];
}
export function useHomeFeed(topics: Topic[], enabled: boolean) {
  const [data, setData] = useState<HomeFeedData>({
    trending: [],
    recommendations: [],
    messages: [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const queries = JSON.stringify(topics.slice(-2).map((topic) => topic.query));
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setBusy(true);
    setError("");
    setData({ trending: [], recommendations: [], messages: [] });
    callApi<HomeFeedData>("feed/home", { queries: JSON.parse(queries) })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        if (!cancelled)
          setError(
            error instanceof Error
              ? error.message
              : "Home videos could not load.",
          );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queries, enabled, retry]);
  return { ...data, busy, error, retry: () => setRetry((value) => value + 1) };
}
