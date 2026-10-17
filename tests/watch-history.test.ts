import test from "node:test";
import assert from "node:assert/strict";
import {
  historyAction,
  historyDay,
  watchedVideos,
} from "../shared/features/progress/history-rules";
import type { VideoProgress } from "../shared/features/progress/useVideoProgress";
const row: VideoProgress = {
  video_id: "abcdefghijk",
  topic_key: "computing:gpu",
  position_seconds: 138,
  duration_seconds: 384,
  completed: false,
};
test("History includes completed and unfinished videos, sorts known dates and preserves undated legacy order", () => {
  const old = { ...row, video_id: "bcdefghijkl" };
  const completed = {
    ...row,
    video_id: "cdefghijklm",
    completed: true,
    updated_at: "2026-10-18T06:00:00Z",
  };
  const recent = { ...row, updated_at: "2026-10-18T07:00:00Z" };
  assert.deepEqual(
    watchedVideos([old, completed, recent, { ...row, position_seconds: 0 }]),
    [recent, completed, old],
  );
  assert.equal(historyAction(row), "Resume · 02:18");
  assert.equal(historyAction(completed), "Watch again");
});
test("History groups by local calendar days and leaves missing or invalid dates under Earlier", () => {
  const now = new Date(2026, 9, 18, 12);
  assert.equal(
    historyDay(
      { ...row, updated_at: new Date(2026, 9, 18, 1).toISOString() },
      now,
    ),
    "Today",
  );
  assert.equal(
    historyDay(
      { ...row, updated_at: new Date(2026, 9, 17, 23).toISOString() },
      now,
    ),
    "Yesterday",
  );
  assert.equal(historyDay(row, now), "Earlier");
  assert.equal(historyDay({ ...row, updated_at: "invalid" }, now), "Earlier");
  assert.notEqual(
    historyDay(
      { ...row, updated_at: new Date(2026, 8, 17).toISOString() },
      now,
    ),
    "Yesterday",
  );
});
