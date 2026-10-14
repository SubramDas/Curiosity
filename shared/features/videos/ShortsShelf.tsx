import type { Video } from "../../types";
import { readableTitle } from "../../lib/api";
import { Icon } from "../../components/Icon";
import { VideoThumbnail } from "./VideoThumbnail";
import type { VideoProgress } from "../progress/useVideoProgress";

export function ShortsShelf({
  videos,
  onSelect,
  progress = [],
}: {
  videos: Video[];
  onSelect: (video: Video) => void;
  progress?: VideoProgress[];
}) {
  if (!videos.length) return null;
  return (
    <section className="shorts-shelf" aria-label="Shorts">
      <h2>
        <Icon name="shorts" />
        Shorts
      </h2>
      <div className="shorts-grid">
        {videos.map((video) => (
          <button
            className="short-card"
            key={video.id}
            onClick={() => onSelect(video)}
          >
            <VideoThumbnail
              video={video}
              short
              saved={progress.find((row) => row.video_id === video.id)}
            />
            <strong>{readableTitle(video.title)}</strong>
            <small>{video.channel} · YouTube</small>
          </button>
        ))}
      </div>
      <p className="fine-print">
        Short videos up to 3 minutes. YouTube does not identify Shorts in search
        results.
      </p>
    </section>
  );
}
