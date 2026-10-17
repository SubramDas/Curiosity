# Desktop Watch history

Implements the approved Penpot Watch history review. Mobile retains its Continue watching destination and unfinished-only behavior. Home/topic resume shortcuts retain their existing names.

- `WatchHistory.tsx` owns the desktop list, day headings, action buttons and pagination. Each page has at most 20 entries, matching the existing video-details API limit.
- `shared/features/progress/history-rules.ts` selects watched records, sorts timestamps and formats day/action labels. Finished videos remain in history; unfinished videos show a Resume time, progress and time remaining. Old records without timestamps appear under Earlier in their existing order.
- `shared/features/progress/useHistoryVideos.ts` restores missing metadata, supports retry and ignores late results after navigation. Missing videos retain an unavailable row instead of being removed from saved history.
- `useVideoProgress` stamps new local progress changes with `updated_at`. Account reads include the existing Supabase `updated_at` column; the backend still sets the account timestamp and verified owner on save. No migration is required. Progress retention remains capped at 200 unique videos.
- `src/App.tsx` opens the existing player with the saved topic and video. Unfinished playback uses the stored time; completed playback starts at zero. Back to Watch history returns to the list. History playback suppresses the extra resume shelf and automatic page scrolling, preserving the visible return control.

## Verification

Production build and 95 service/rule/renderer/experiment checks passed. Focused simulated browser checks cover day grouping, completed/unfinished states, restoring long-video and Short positions, replay from zero, unavailable metadata/retry, 20-item detail pages, desktop teacher playback and existing mobile behavior. Provider calls/player behavior are simulated; live account synchronization and real YouTube autoplay were not exercised. No deployment or database migration was performed.
