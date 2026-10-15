import { VideoClassificationLabel } from "../classification/VideoClassificationLabel";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadYouTubePlayer, type Player } from "./youtube-player";
import { readableTitle } from "../../lib/api";
import type { Video, VideoSeekRequest } from "../../types";

export function VideoPlayer({
  playOnOpen = false,
  showPlayButton = true,
  renderMetadata,
  video,
  onActive,
  startSeconds = 0,
  onProgress,
  short = false,
  autoPlay = false,
  seekRequest,
}: {
  playOnOpen?: boolean;
  showPlayButton?: boolean;
  renderMetadata?: (video: Video, short?: boolean) => ReactNode;
  video: Video;
  seekRequest?: VideoSeekRequest;
  onActive: (active: boolean) => void;
  startSeconds?: number;
  short?: boolean;
  autoPlay?: boolean;
  onProgress?: (position: number, duration: number, completed: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const playerRef = useRef<Player | undefined>(undefined);
  const callbacks = useRef({ onProgress, startSeconds });
  callbacks.current = { onProgress, startSeconds };
  useEffect(() => {
    let disposed = false;
    let playing = false;
    let visible = false;
    let player: Player | undefined;
    let ready = false;
    let completed = false;
    let waitingToStart = playOnOpen;
    const startSelectedVideo = () => {
      if (!waitingToStart || !ready || !visible || document.hidden || !player)
        return;
      waitingToStart = false;
      player.playVideo();
    };
    const report = () => {
      if (!ready || !player) return;
      const duration = player.getDuration();
      const position = player.getCurrentTime();
      if (duration > 0 && Number.isFinite(position))
        callbacks.current.onProgress?.(
          Math.min(position, duration),
          duration,
          completed,
        );
    };
    const interval = window.setInterval(() => {
      if (playing) report();
    }, 5000);
    const onHidden = () => {
      if (document.hidden) {
        report();
        player?.pauseVideo();
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", report);
    const observer = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible;
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        startSelectedVideo();
        if (visible && !wasVisible && ready && autoPlay && !document.hidden) {
          player?.mute();
          player?.playVideo();
        }
        if (!visible && playing) {
          report();
          player?.pauseVideo();
        }
        onActive(playing && visible);
      },
      { threshold: [0, 0.5, 1] },
    );
    setError("");
    setIsReady(false);
    onActive(false);
    const host = document.createElement("div");
    container.current?.append(host);
    if (container.current) observer.observe(container.current);
    if (video.details && !video.details.embeddable)
      setError(
        "This video is not available in the embedded player. Choose another result.",
      );
    else
      loadYouTubePlayer()
        .then(() => {
          if (disposed || !window.YT) return;
          player = new window.YT.Player(host, {
            videoId: video.id,
            width: "100%",
            height: "100%",
            playerVars: {
              origin: window.location.origin,
              playsinline: 1,
              start: Math.floor(callbacks.current.startSeconds),
            },
            events: {
              onReady: (event) => {
                if (disposed) return;
                ready = true;
                playerRef.current = event.target;
                setIsReady(true);
                // Cue first: seeking and immediately pausing an unstarted player
                // can leave YouTube showing a black frame instead of its preview.
                if (callbacks.current.startSeconds > 0)
                  event.target.cueVideoById({
                    videoId: video.id,
                    startSeconds: callbacks.current.startSeconds,
                  });
                if (!short)
                  container.current?.scrollIntoView({ block: "center" });
                startSelectedVideo();
                if (autoPlay && visible && !document.hidden) {
                  event.target.mute();
                  event.target.playVideo();
                }
              },
              onStateChange: (event) => {
                if (disposed) return;
                playing = event.data === 1;
                if (event.data === 0) completed = true;
                else if (event.data === 1) completed = false;
                if (playing && (!visible || document.hidden))
                  player?.pauseVideo();
                if (event.data === 2 || event.data === 0) report();
                onActive(playing && visible);
              },
              onError: () => {
                onActive(false);
                setError(
                  "YouTube cannot play this video here. Choose another result or open it on YouTube.",
                );
              },
            },
          });
        })
        .catch(() => {
          if (!disposed)
            setError(
              "The YouTube player could not load. Check your connection or choose another result.",
            );
        });
    return () => {
      report();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", report);
      disposed = true;
      observer.disconnect();
      if (playerRef.current === player) playerRef.current = undefined;
      player?.destroy();
      host.remove();
      onActive(false);
    };
  }, [
    video.id,
    video.details?.embeddable,
    onActive,
    short,
    autoPlay,
    playOnOpen,
    retry,
  ]);
  useEffect(() => {
    if (
      !isReady ||
      !seekRequest ||
      seekRequest.videoId !== video.id ||
      !Number.isFinite(seekRequest.seconds) ||
      seekRequest.seconds < 0
    )
      return;
    playerRef.current?.seekTo(seekRequest.seconds, true);
    container.current?.scrollIntoView({ block: "center" });
  }, [isReady, seekRequest?.requestId, video.id]);
  return (
    <section className={`player-section ${short ? "short-player" : ""}`}>
      {short &&
        (renderMetadata ? (
          renderMetadata(video, true)
        ) : (
          <VideoClassificationLabel video={video} short />
        ))}
      <div
        className="player-frame"
        ref={container}
        aria-label="YouTube video player"
      />
      {error && (
        <p className="notice" role="alert">
          {error}{" "}
          <button onClick={() => setRetry((value) => value + 1)}>
            Retry player
          </button>
        </p>
      )}
      {showPlayButton && isReady && !error && !short && (
        <button onClick={() => playerRef.current?.playVideo()}>
          {startSeconds > 0 ? "Resume video" : "Play video"}
        </button>
      )}
      <h3>{readableTitle(video.title)}</h3>
      {!short &&
        (renderMetadata ? (
          renderMetadata(video)
        ) : (
          <VideoClassificationLabel video={video} />
        ))}
      <p className="muted">{video.channel} · YouTube · Unreviewed result</p>
      <a href={video.watchUrl} target="_blank" rel="noreferrer">
        Open on YouTube ↗
      </a>
    </section>
  );
}
