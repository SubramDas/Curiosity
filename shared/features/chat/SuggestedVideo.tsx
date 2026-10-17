import type { Video } from "../../types";
import { readableTitle } from "../../lib/api";
import { VideoThumbnail } from "../videos/VideoThumbnail";
import { VideoClassificationLabel } from "../classification/VideoClassificationLabel";

export function SuggestedVideo({
  video,
  onSelect,
}: {
  video: Video;
  onSelect: (video: Video) => void;
}) {
  return (
    <article className="related-video chat-video-card">
      <button
        className="chat-video-thumbnail"
        aria-label={`Watch ${readableTitle(video.title)}`}
        onClick={() => onSelect(video)}
      >
        <VideoThumbnail video={video} />
      </button>
      <div className="chat-video-details">
        <button className="chat-video-title" onClick={() => onSelect(video)}>
          {readableTitle(video.title)}
        </button>
        <span className="chat-video-channel">{video.channel}</span>
        <button
          className="chat-video-watch"
          aria-label={`Watch video: ${readableTitle(video.title)}`}
          onClick={() => onSelect(video)}
        >
          Watch video
        </button>
      </div>
      <div className="chat-video-classification">
        <VideoClassificationLabel video={video} />
      </div>
    </article>
  );
}
