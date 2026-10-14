import { VideoResults } from "../videos/VideoResults";
import { useEffect, useState } from "react";
import type { Video } from "../../types";
import type { VideoProgress } from "./useVideoProgress";
import { callApi } from "../../lib/api";

export function ContinueWatching({
  rows,
  topicKey,
  videos,
  onSelect,
  limit = 20,
  onViewAll,
}: {
  limit?: number;
  onViewAll?: () => void;
  rows: VideoProgress[];
  topicKey?: string;
  videos: Video[];
  onSelect: (video: Video, topicKey: string) => void;
}) {
  const saved = rows
    .filter(
      (row) =>
        (!topicKey || row.topic_key === topicKey) &&
        !row.completed &&
        row.position_seconds > 0,
    )
    .slice(0, Math.min(limit, 20));
  const [restored, setRestored] = useState<Video[]>([]);
  const [message, setMessage] = useState("");
  const missing = saved
    .filter((row) => !videos.some((video) => video.id === row.video_id))
    .map((row) => row.video_id)
    .sort()
    .join(",");
  useEffect(() => {
    let cancelled = false;
    setRestored([]);
    setMessage("");
    if (missing)
      callApi<Video[]>("videos/details", { ids: missing.split(",") })
        .then((items) => {
          if (!cancelled) {
            setRestored(items);
            if (items.length < missing.split(",").length)
              setMessage("Some saved videos are no longer available.");
          }
        })
        .catch(() => {
          if (!cancelled)
            setMessage(
              "Saved video details could not load. Try reopening this topic.",
            );
        });
    return () => {
      cancelled = true;
    };
  }, [missing]);
  if (!saved.length) return null;
  return (
    <section className="continue-watching" aria-label="Continue watching">
      <div className="continue-heading">
        <h3>Continue watching</h3>
        {onViewAll && (
          <button className="text-button" onClick={onViewAll}>
            View all →
          </button>
        )}
      </div>
      <p className="muted">Pick up where you left off.</p>
      <VideoResults
        videos={saved.flatMap((row) => {
          const video = [...videos, ...restored].find(
            (item) => item.id === row.video_id,
          );
          return video ? [video] : [];
        })}
        progress={saved}
        onSelect={(video) =>
          onSelect(
            video,
            saved.find((row) => row.video_id === video.id)!.topic_key,
          )
        }
      />
      {message && <p role="status">{message}</p>}
    </section>
  );
}
