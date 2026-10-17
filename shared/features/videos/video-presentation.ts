import type { ReactNode } from "react";
import type { Video } from "../../types";

/** Optional layout choices; defaults preserve the current mobile experience. */
export interface VideoPresentation {
  renderMetadata?: (video: Video, short?: boolean) => ReactNode;
  playOnOpen?: boolean;
  scrollOnOpen?: boolean;
  showPlayButton?: boolean;
  showProgressLabel?: boolean;
}
