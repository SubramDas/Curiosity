import type { Video } from "../../../shared/types";
import type { VideoPresentation } from "../../../shared/features/videos/video-presentation";
import { VideoClassificationLabel } from "../../../shared/features/classification/VideoClassificationLabel";
export function VideoUniverseLabel({
  video,
  short = false,
}: {
  video: Video;
  short?: boolean;
}) {
  return <VideoClassificationLabel video={video} short={short} />;
}
export const desktopVideoPresentation: VideoPresentation = {
  renderMetadata: (video, short) => (
    <VideoUniverseLabel video={video} short={short} />
  ),
  playOnOpen: true,
  showPlayButton: false,
  showProgressLabel: false,
};
