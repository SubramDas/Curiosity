import { useEffect, useRef } from "react";
import { callApi } from "../../lib/api";

// A public-video session binds a related break to server-checked learning content.
export function useRelatedBreak(
  videoId: string | undefined,
  active: boolean,
  demo: boolean,
) {
  const permit = useRef("");
  const pending = useRef<Promise<string> | null>(null);
  const generation = useRef(0);
  const currentVideo = useRef(videoId);
  currentVideo.current = videoId;
  const storageKey = () =>
    `curiosity-related-break:${currentVideo.current}:${demo ? "demo-v2" : "real"}`;
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function prepare(): Promise<string> {
    if (permit.current) return permit.current;
    if (pending.current) return pending.current;
    if (!currentVideo.current)
      throw new Error(
        "Watch an educational video before requesting a related break.",
      );
    const current = generation.current;
    const key = storageKey();
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (
        saved &&
        typeof saved.permit === "string" &&
        saved.expiresAt > Date.now()
      ) {
        permit.current = saved.permit;
        return saved.permit;
      }
    } catch {
      /* Browser storage is optional. */
    }
    pending.current = callApi<{ permit: string }>("search/session", {
      videoId: currentVideo.current,
      demo,
    })
      .then((result) => {
        if (generation.current !== current)
          throw new Error("This learning session changed. Please try again.");
        if (!/^[\da-f-]{36}$/i.test(result.permit))
          throw new Error("The related break could not be prepared.");
        permit.current = result.permit;
        try {
          sessionStorage.setItem(
            key,
            JSON.stringify({
              permit: result.permit,
              expiresAt: Date.now() + 5 * 3600_000,
            }),
          );
        } catch {
          /* Session stays in memory. */
        }
        return result.permit;
      })
      .finally(() => {
        if (generation.current === current) pending.current = null;
      });
    return pending.current;
  }
  useEffect(() => {
    if (active && videoId) void prepare().catch(() => {});
    // Start at playback; report errors only when the learner requests the break.
  }, [active, videoId, demo]);
  function reset() {
    generation.current++;
    permit.current = "";
    pending.current = null;
    try {
      sessionStorage.removeItem(storageKey());
    } catch {
      /* Optional storage. */
    }
  }
  return { prepare, reset };
}
