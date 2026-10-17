import type { VideoProgress } from "./useVideoProgress";

export function historyTime(row: VideoProgress): number | null {
  const time =
    typeof row.updated_at === "string" ? Date.parse(row.updated_at) : NaN;
  return Number.isFinite(time) ? time : null;
}

export function watchedVideos(rows: VideoProgress[]): VideoProgress[] {
  return rows
    .filter((row) => row.completed || row.position_seconds > 0)
    .sort((a, b) => (historyTime(b) ?? 0) - (historyTime(a) ?? 0));
}

export function historyDay(row: VideoProgress, now = new Date()): string {
  const time = historyTime(row);
  if (time === null) return "Earlier";
  const date = new Date(time);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function historyAction(row: VideoProgress): string {
  if (row.completed) return "Watch again";
  const seconds = Math.floor(row.position_seconds);
  return `Resume · ${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
