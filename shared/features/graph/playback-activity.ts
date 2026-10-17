import type { PlaybackSample } from "./graph-types";
// Media position corroborates playback; elapsed wall time is the credited amount.
export function activeMilliseconds(
  previous: PlaybackSample | null,
  next: PlaybackSample,
) {
  if (
    !previous ||
    previous.owner !== next.owner ||
    previous.videoId !== next.videoId ||
    !previous.active ||
    !next.active
  )
    return 0;
  const elapsed = next.now - previous.now,
    media = next.position - previous.position,
    rate = previous.rate;
  if (
    !Number.isFinite(elapsed) ||
    elapsed <= 0 ||
    elapsed > 2000 ||
    !Number.isFinite(media) ||
    media <= 0.02 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    media > (elapsed / 1000) * rate + 0.75
  )
    return 0;
  return Math.floor(elapsed);
}
