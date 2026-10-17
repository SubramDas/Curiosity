import { useState } from "react";
import type { Video } from "../../../shared/types";
import type { VideoProgress } from "../../../shared/features/progress/useVideoProgress";
import {
  historyAction,
  historyDay,
  watchedVideos,
} from "../../../shared/features/progress/history-rules";
import { useHistoryVideos } from "../../../shared/features/progress/useHistoryVideos";
import { VideoThumbnail } from "../../../shared/features/videos/VideoThumbnail";
import { VideoClassificationLabel } from "../../../shared/features/classification/VideoClassificationLabel";
import {
  formatPosition,
  isShortVideo,
} from "../../../shared/features/videos/video-format";
import { readableTitle } from "../../../shared/lib/api";
import "./watch-history.css";

export function WatchHistory({
  rows,
  videos,
  loading,
  message,
  onSelect,
}: {
  rows: VideoProgress[];
  videos: Video[];
  loading: boolean;
  message: string;
  onSelect: (video: Video, row: VideoProgress) => void;
}) {
  const [page, setPage] = useState(0);
  const history = watchedVideos(rows);
  const pageCount = Math.max(1, Math.ceil(history.length / 20));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = loading
    ? []
    : history.slice(currentPage * 20, (currentPage + 1) * 20);
  const details = useHistoryVideos(visible, videos);
  let previousDay = "";
  return (
    <section className="watch-history" aria-label="Watch history">
      <h1>Watch history</h1>
      <p className="history-description">
        Your watched videos and Shorts, all in one place.
      </p>
      <p className="history-help">
        Resume picks up where you stopped. Finished videos are ready to watch
        again.
      </p>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {loading ? (
        <p role="status">Loading your watch history…</p>
      ) : !history.length ? (
        <p className="empty-state">
          Your watched videos and Shorts will appear here after you start
          watching.
        </p>
      ) : (
        <>
          {details.loading && <p role="status">Loading saved video details…</p>}
          {details.failed && (
            <p className="notice" role="alert">
              Saved video details could not load.{" "}
              <button onClick={details.retry}>Retry history</button>
            </p>
          )}
          {visible.map((row) => {
            const day = historyDay(row);
            const heading = day !== previousDay;
            previousDay = day;
            const video = details.videos.find(
              (video) => video.id === row.video_id,
            );
            const action = historyAction(row);
            return (
              <div key={row.video_id}>
                {heading && <h2 className="history-day">{day}</h2>}
                {video ? (
                  <article
                    className={`history-card ${row.completed ? "history-completed" : ""}`}
                    aria-label={readableTitle(video.title)}
                  >
                    <button
                      className="history-thumbnail"
                      aria-label={`${action}: ${readableTitle(video.title)}`}
                      onClick={() => onSelect(video, row)}
                    >
                      <VideoThumbnail
                        video={video}
                        saved={row}
                        short={isShortVideo(video)}
                      />
                    </button>
                    <div className="history-copy">
                      <button
                        className="history-title"
                        onClick={() => onSelect(video, row)}
                      >
                        {readableTitle(video.title)}
                      </button>
                      <VideoClassificationLabel video={video} />
                      <p className="history-creator">
                        {video.channel} ·{" "}
                        {isShortVideo(video) ? "Short" : "Video"} ·{" "}
                        {formatPosition(row.duration_seconds)}
                      </p>
                      <p className="history-status">
                        {row.completed
                          ? "Watched"
                          : `Watched ${formatPosition(row.position_seconds)} of ${formatPosition(row.duration_seconds)} · ${formatPosition(Math.max(0, row.duration_seconds - row.position_seconds))} left`}
                      </p>
                    </div>
                    <button
                      className={`history-action ${row.completed ? "secondary" : ""}`}
                      aria-label={`${action}: ${readableTitle(video.title)}`}
                      onClick={() => onSelect(video, row)}
                    >
                      {action}
                    </button>
                  </article>
                ) : (
                  <article
                    className="history-unavailable"
                    aria-label="Saved video unavailable"
                  >
                    <strong>
                      {details.loading
                        ? "Loading saved video…"
                        : details.failed
                          ? "Video details unavailable"
                          : "Video no longer available"}
                    </strong>
                    <p>
                      {row.completed
                        ? "Watched"
                        : `Saved at ${formatPosition(row.position_seconds)}`}
                    </p>
                  </article>
                )}
              </div>
            );
          })}
          {pageCount > 1 && (
            <nav className="history-pagination" aria-label="History pages">
              <button
                className="secondary"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage + 1} of {pageCount}
              </span>
              <button
                className="secondary"
                disabled={currentPage + 1 >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
