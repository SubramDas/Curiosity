# Desktop Universe feeds

Implements the approved **curiosity-desktop-universe** Penpot page and the desktop label/resume refinement. The phone layout keeps its existing navigation and playback controls.

## Behaviour

- Trending is the starting feed. Science & Technology, Commerce & Business and Arts & Humanities always appear in the top row and sidebar.
- A Universe opens directly into videos. Subject filters work on the loaded results without a new provider request. Search still shows mixed results from every Universe.
- Long-video cards/player show the video title, then **Universe – subtopic**, then creator information. Shorts retain labels above their thumbnails/player.
- A normal desktop video click attempts playback at the saved position, without an extra app Play/Resume button. Completed videos start at zero. The official player controls remain available if the browser blocks playback. Moving away still records progress and pauses hidden playback.
- Previously saved categories are mapped for display without rewriting topic keys, Supabase records or playback storage. Saved searches can be reopened from the Universe feed. Unassigned legacy searches remain under Other saved searches.

## Modules

- `UniverseNavigation.tsx`: top navigation and sidebar.
- `UniverseFeed.tsx`: video feed, subject filters and saved-search shortcuts.
- `useUniverseFeed.ts`: cancellable loading, retry and feed state.
- `VideoUniverseLabel.tsx`: desktop metadata rendering and playback presentation settings.
- `shared/features/universes/universe-rules.ts`: provisional classification and mapping of older saved categories.
- `shared/features/videos/video-presentation.ts`: optional layout choices. Defaults preserve mobile behaviour; shared code never imports desktop modules.

The new `/api/feed/universe` route reuses the existing home suggestion loader but skips unrelated Trending calls. It requests at most two searches: the latest saved search in that Universe and a starting discovery query. Existing persistent YouTube cache and provider counters cover these requests. New feeds can consume allowance; filtering loaded results does not.

## Limits

Classification uses English words in each video title, not a complete internet graph or AI classification request. A video can have one primary Universe and related-Universe tags. Unknown videos remain watchable without a label. A Universe feed excludes clearly classified videos from other Universes, while retaining unclassified results from its search queries. Some title matches and subtopics will need refinement through real use.

These changes are local, not yet redeployed to Google Cloud. Restart `npm run dev` to load the new API route, then review http://127.0.0.1:5173 on desktop. No keys or SQL migration are required.

## Verification

- TypeScript checks and production build pass.
- 45 service/rule checks pass, including legacy-key preservation, overlap/unclassified handling and a real local HTTP route using simulated providers. The route test confirms search and Universe feeds share the provider cache.
- 34 browser journeys covered across the regression and focused runs. The initial regression passed 32 of 33; the remaining playback check expected an obsolete visible Watched label. Its assertion was updated to the accessible label and passed a focused rerun. Four Universe journeys passed, including the additional feed-failure/unassigned-search case. All nine existing phone journeys passed.
- Desktop Universe, mixed-search and player screenshots were inspected. Player behaviour is tested with a simulated YouTube player; actual unmuted autoplay on every browser is not established by those tests.
