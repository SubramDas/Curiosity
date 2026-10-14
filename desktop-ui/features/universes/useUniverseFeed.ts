import { useEffect, useState } from "react";
import { callApi } from "../../../shared/lib/api";
import type { Topic, Video } from "../../../shared/types";
import type { HomeFeedData } from "../../../shared/features/home/useHomeFeed";
import {
  groupUniverseTopics,
  universes,
  type UniverseId,
} from "../../../shared/features/universes/universe-rules";

export function useUniverseFeed(universe: UniverseId, topics: Topic[]) {
  const [data, setData] = useState<{ videos: Video[]; messages: string[] }>({
    videos: [],
    messages: [],
  });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const saved = groupUniverseTopics(topics, universe);
  const queries = JSON.stringify([
    ...new Set(
      [saved[0]?.query, universes[universe].query].filter((q): q is string =>
        Boolean(q),
      ),
    ),
  ]);
  useEffect(() => {
    let active = true;
    setData({ videos: [], messages: [] });
    setBusy(true);
    setError("");
    // The existing provider cache and daily reservations also cover these feeds.
    callApi<HomeFeedData>("feed/universe", { queries: JSON.parse(queries) })
      .then((result) => {
        if (active)
          setData({
            videos: [
              ...new Map(
                result.recommendations
                  .flatMap((g) => g.videos)
                  .map((v) => [v.id, v]),
              ).values(),
            ],
            messages: result.messages,
          });
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error ? error.message : "Videos could not load.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [universe, queries, attempt]);
  return { ...data, busy, error, retry: () => setAttempt((n) => n + 1) };
}
