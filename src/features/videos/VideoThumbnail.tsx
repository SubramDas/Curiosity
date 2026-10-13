import { useState } from "react";
import type { Video } from "../../types";
import type { VideoProgress } from "../progress/useVideoProgress";
import { durationSeconds, formatPosition } from "./video-format";

export function VideoThumbnail({
  video,
  saved,
  short = false,
}: {
  video: Video;
  saved?: VideoProgress;
  short?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const seconds = durationSeconds(video.details?.duration);
  const validId = /^[A-Za-z0-9_-]{11}$/.test(video.id);
  return (
    <span className={`video-thumbnail ${short ? "portrait" : ""}`}>
      {!failed && validId ? (
        <img
          src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="thumbnail-fallback">YouTube video</span>
      )}
      {seconds !== null && (
        <span className="duration-badge">{formatPosition(seconds)}</span>
      )}
      {saved && (
        <span className="watch-progress">
          <span
            style={{
              width: `${saved.completed ? 100 : Math.min(100, (saved.position_seconds / saved.duration_seconds) * 100)}%`,
            }}
          />
        </span>
      )}
    </span>
  );
}
