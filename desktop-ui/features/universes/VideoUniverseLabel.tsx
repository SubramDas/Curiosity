import type { Video } from "../../../shared/types";
import {
  classifyVideo,
  universes,
} from "../../../shared/features/universes/universe-rules";
import type { VideoPresentation } from "../../../shared/features/videos/video-presentation";

export function VideoUniverseLabel({
  video,
  short = false,
}: {
  video: Video;
  short?: boolean;
}) {
  const classification = classifyVideo(video);
  if (!classification) return null;
  return (
    <span
      className={`universe-video-label ${short ? "short-universe-label" : ""}`}
    >
      <span>
        {universes[classification.universe].name} – {classification.subtopic}
      </span>
      {classification.relatedUniverses.map((id) => (
        <span className="universe-related-tag" key={id}>
          Also related to {universes[id].name}
        </span>
      ))}
    </span>
  );
}
export const desktopVideoPresentation: VideoPresentation = {
  renderMetadata: (video, short) => (
    <VideoUniverseLabel video={video} short={short} />
  ),
  playOnOpen: true,
  showPlayButton: false,
  showProgressLabel: false,
};
