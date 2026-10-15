import { VideoClassificationLabel } from "../classification/VideoClassificationLabel";
import type { VideoPresentation } from "./video-presentation";
import { VideoThumbnail } from "./VideoThumbnail";
import { readableTitle } from "../../lib/api";
import { useEffect, useRef, type ReactNode } from "react";
import type { VideoProgress } from "../progress/useVideoProgress";
import { formatPosition } from "./video-format";
import type { Video } from "../../types";

export function VideoResults({
  presentation,
  videos,
  selectedId,
  onSelect,
  renderPlayer,
  progress = [],
}: {
  presentation?: VideoPresentation;
  videos: Video[];
  selectedId?: string;
  onSelect: (video: Video) => void;
  renderPlayer?: (video: Video) => ReactNode;
  progress?: VideoProgress[];
}) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedId)
      list.current
        ?.querySelector(".video-card.selected")
        ?.closest(".video-result")
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);
  return (
    <div className="video-list" ref={list}>
      {videos.map((video) => {
        const saved = progress.find((row) => row.video_id === video.id);
        return (
          <article
            className={`video-result ${video.id === selectedId && renderPlayer ? "expanded-result" : ""}`}
            key={video.id}
          >
            {video.id === selectedId && renderPlayer?.(video)}
            <div
              className={`video-card ${video.id === selectedId ? "selected" : ""}`}
              aria-label={`${readableTitle(video.title)}${saved ? (saved.completed ? " Watched" : ` Continue at ${formatPosition(saved.position_seconds)}`) : ""}`}
              onClick={() => onSelect(video)}
            >
              <div className="video-select-thumbnail">
                <VideoThumbnail video={video} saved={saved} />
              </div>
              <div className="video-info">
                <span className="channel-avatar" aria-hidden="true">
                  {video.channel.slice(0, 1).toUpperCase() || "Y"}
                </span>
                <div className="video-copy">
                  <button
                    aria-label={`${readableTitle(video.title)}${saved ? (saved.completed ? " Watched" : ` Continue at ${formatPosition(saved.position_seconds)}`) : ""}`}
                    className="video-select-title"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(video);
                    }}
                  >
                    <strong>{readableTitle(video.title)}</strong>
                  </button>
                  {presentation?.renderMetadata ? (
                    presentation.renderMetadata(video)
                  ) : (
                    <VideoClassificationLabel video={video} />
                  )}
                  <small>{video.channel}</small>
                  <small>
                    YouTube ·{" "}
                    {video.details?.duration?.replace("PT", "").toLowerCase() ??
                      "Length unavailable"}
                  </small>
                </div>
              </div>
              {saved && presentation?.showProgressLabel !== false && (
                <small className="progress-label">
                  {saved.completed
                    ? "Watched"
                    : `Continue at ${formatPosition(saved.position_seconds)}`}
                </small>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
