import { VideoClassificationLabel } from "../classification/VideoClassificationLabel";
import type { VideoPresentation } from "./video-presentation";
import type { Video } from "../../types";
import { readableTitle } from "../../lib/api";
import { Icon } from "../../components/Icon";
import { VideoThumbnail } from "./VideoThumbnail";
import type { VideoProgress } from "../progress/useVideoProgress";

export function ShortsShelf({
  presentation,
  videos,
  onSelect,
  progress = [],
}: {
  presentation?: VideoPresentation;
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
          <div
            className="short-card"
            key={video.id}
            onClick={() => onSelect(video)}
          >
            {presentation?.renderMetadata ? (
              presentation.renderMetadata(video, true)
            ) : (
              <VideoClassificationLabel video={video} short />
            )}
            <div className="video-select-thumbnail">
              <VideoThumbnail
                video={video}
                short
                saved={progress.find((row) => row.video_id === video.id)}
              />
            </div>
            <button
              className="video-select-title"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(video);
              }}
            >
              <strong>{readableTitle(video.title)}</strong>
            </button>
            <small>{video.channel} · YouTube</small>
          </div>
        ))}
      </div>
      <p className="fine-print">
        Short videos up to 3 minutes. YouTube does not identify Shorts in search
        results.
      </p>
    </section>
  );
}
