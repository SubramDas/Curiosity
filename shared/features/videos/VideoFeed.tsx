import { useEffect, useRef, useState } from "react";
import type { Video, VideoSeekRequest } from "../../types";
import type { VideoProgress } from "../progress/useVideoProgress";
import { ShortsShelf } from "./ShortsShelf";
import { VideoThumbnail } from "./VideoThumbnail";
import { VideoPlayer } from "./VideoPlayer";
import { VideoResults } from "./VideoResults";
import { isShortVideo } from "./video-format";

export function VideoFeed({
  videos,
  selected,
  onSelect,
  onActive,
  progress,
  onProgress,
  initialMode = "all",
  seekRequest,
  onCurrentVideo,
  showReelControls = false,
  isHidden = false,
}: {
  isHidden?: boolean;
  showReelControls?: boolean;
  initialMode?: "all" | "short";
  seekRequest?: VideoSeekRequest;
  onCurrentVideo: (video: Video | null) => void;
  videos: Video[];
  selected: Video | null;
  onSelect: (video: Video) => void;
  onActive: (active: boolean) => void;
  progress: VideoProgress[];
  onProgress: (
    video: Video,
    position: number,
    duration: number,
    completed: boolean,
  ) => void;
}) {
  const [mode, setMode] = useState<"all" | "short" | "long">(initialMode);
  const [shortId, setShortId] = useState<string | null>(null);
  const reelContainer = useRef<HTMLDivElement>(null);
  const shortVideos = (
    selected && !videos.some((video) => video.id === selected.id)
      ? [selected, ...videos]
      : videos
  ).filter(isShortVideo);
  const resultVideos =
    selected && !videos.some((video) => video.id === selected.id)
      ? [selected, ...videos]
      : videos;
  const shown = resultVideos.filter((video) => !isShortVideo(video));
  useEffect(() => {
    if (!selected) return;
    setMode(isShortVideo(selected) ? "short" : "all");
    setShortId(selected.id);
  }, [selected]);
  useEffect(() => {
    if (mode !== "short" || isHidden) return;
    const cards =
      reelContainer.current?.querySelectorAll<HTMLElement>(".reel-card");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting && entry.intersectionRatio >= 0.65)
            setShortId((entry.target as HTMLElement).dataset.videoId ?? null);
      },
      { root: reelContainer.current, threshold: 0.65 },
    );
    cards?.forEach((card) => observer.observe(card));
    const chosen = Array.from(cards ?? []).find(
      (card) => card.dataset.videoId === (shortId ?? selected?.id),
    );
    chosen?.scrollIntoView({ block: "nearest" });
    return () => observer.disconnect();
  }, [mode, videos, selected?.id, isHidden]);
  const activeId = shortId ?? shortVideos[0]?.id;
  const activeIndex = shortVideos.findIndex((video) => video.id === activeId);
  function moveToShort(index: number) {
    const card =
      reelContainer.current?.querySelectorAll<HTMLElement>(".reel-card")[index];
    if (!card || !shortVideos[index]) return;
    setShortId(shortVideos[index].id);
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
  const currentVideo =
    mode === "short"
      ? (shortVideos.find((video) => video.id === activeId) ?? null)
      : selected;
  useEffect(() => {
    onCurrentVideo(currentVideo);
  }, [currentVideo?.id, onCurrentVideo]);
  function player(video: Video, short = false) {
    const saved = progress.find((row) => row.video_id === video.id);
    return (
      <VideoPlayer
        key={video.id}
        video={video}
        onActive={onActive}
        seekRequest={
          seekRequest?.videoId === video.id ? seekRequest : undefined
        }
        startSeconds={saved?.completed ? 0 : (saved?.position_seconds ?? 0)}
        short={short}
        autoPlay={short}
        onProgress={(position, duration, completed) =>
          onProgress(video, position, duration, completed)
        }
      />
    );
  }
  return (
    <div className="video-feed">
      <div
        className={`feed-tabs ${initialMode === "short" ? "sr-only" : ""}`}
        aria-label="Video format"
      >
        {(
          [
            ["all", "All videos"],
            ["short", "Short videos"],
            ["long", "Long videos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={mode === value}
            className={mode === value ? "" : "secondary"}
            onClick={() => {
              setMode(value);
              onActive(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "short" ? (
        <>
          <p className="muted">
            Scroll or swipe to the next video · Up to 3 minutes · Starts muted
          </p>
          {!shortVideos.length && (
            <p>
              No short videos in these results. Load more videos or try another
              search.
            </p>
          )}
          <div
            className="reel-feed"
            ref={reelContainer}
            tabIndex={0}
            aria-label="Scrollable short videos"
          >
            {shortVideos.map((video) => (
              <article
                className="reel-card"
                data-video-id={video.id}
                key={video.id}
              >
                {video.id === activeId ? (
                  player(video, true)
                ) : (
                  <button
                    className="reel-preview"
                    onClick={() => setShortId(video.id)}
                  >
                    <VideoThumbnail video={video} short />
                    <strong>{video.title}</strong>
                  </button>
                )}
              </article>
            ))}
          </div>
          {showReelControls && shortVideos.length > 0 && (
            <div className="reel-controls" aria-label="Shorts navigation">
              <button
                className="secondary"
                disabled={activeIndex <= 0}
                onClick={() => moveToShort(activeIndex - 1)}
              >
                Previous Short
              </button>
              <span>
                {activeIndex + 1} / {shortVideos.length}
              </span>
              <button
                className="secondary"
                disabled={activeIndex >= shortVideos.length - 1}
                onClick={() => moveToShort(activeIndex + 1)}
              >
                Next Short
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <VideoResults
            videos={shown}
            selectedId={selected?.id}
            onSelect={onSelect}
            renderPlayer={player}
            progress={progress}
          />
          {mode === "all" && (
            <ShortsShelf
              videos={shortVideos}
              onSelect={onSelect}
              progress={progress}
            />
          )}
        </>
      )}
      {progress.some(
        (row) =>
          !row.completed &&
          row.position_seconds > 0 &&
          videos.some((video) => video.id === row.video_id),
      ) && (
        <p className="fine-print">
          Choose a video marked “Continue” to resume where you stopped.
        </p>
      )}
    </div>
  );
}
