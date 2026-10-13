import type { Video } from "../../types";

export function durationSeconds(
  duration: string | null | undefined,
): number | null {
  const match = duration?.match(
    /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/,
  );
  if (!match) return null;
  return (
    Number(match[1] ?? 0) * 86400 +
    Number(match[2] ?? 0) * 3600 +
    Number(match[3] ?? 0) * 60 +
    Number(match[4] ?? 0)
  );
}
export function isShortVideo(video: Video): boolean {
  const seconds = durationSeconds(video.details?.duration);
  return seconds !== null && seconds > 0 && seconds <= 180;
}
export function formatPosition(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
