# Desktop design review

## Search guardrails review — 2026-10-17

The founder approved planning educational-search guardrails and requested Penpot design first. New Desktop/Mobile Search pages in **New File 1** contain 26 native review boards matching the existing white/green/Roboto layout. Broad queries offer learning choices; entertainment requests redirect to educational angles; users can clarify a learning goal. Existing topic-related breaks remain separate. The founder subsequently approved desktop implementation, now prepared locally. Mobile implementation remains pending. See [the design handoff](../penpot/search/README.md) and [runtime guide](../../backend/search/README.md).

## Graph concept review — 2026-10-15

**Desktop navigation clarification:** the founder requested a screen showing the graph inside the existing website. Three further native boards propose a labeled **Explore map** item immediately below Home, while keeping the white header/sidebar and embedding Graph D in the content area. Home remains general discovery; Map/Feed stays within the selected Universe. Open [the integration review](../penpot/graph/desktop-integration/review.html). Application navigation has not changed.

**Selection update:** the founder chose Graph D (constellation with Map/Feed) and requested a more futuristic, visually appealing treatment. Seven refined native Penpot boards are now on **Graph D2 · Future discovery**. See [the refined review](../penpot/graph/d-refined/review.html) and [handoff](../penpot/graph/d-refined/README.md). The refinement is awaiting visual approval and has not changed application code.

The founder requested an explorable game-like learning map and approved achievements for exploring a previously unexplored topic, with no quiz requirement for now. Four native Penpot concepts compare landscape versus constellation styling and map-first versus Map/Feed navigation. Twenty screens cover desktop/mobile maps, discovery achievements, weekly event details and, for the dual-view options, desktop/mobile feeds. Separate local review files and Penpot page names are recorded in [the graph handoff](../penpot/graph/README.md). Selection remains pending; these concepts do not change the approved running app.

Status: approved by the founder on 2026-10-14, with Trending first in the top bar, followed by subjects the user has searched. Implemented in the local app.

Archived Figma file: https://www.figma.com/design/miSY1sBxnsGIfjjUgx6Djp?node-id=5-2

Direct screens:

- Home: https://www.figma.com/design/miSY1sBxnsGIfjjUgx6Djp?node-id=5-2
- GPU topic: https://www.figma.com/design/miSY1sBxnsGIfjjUgx6Djp?node-id=6-2
- Shorts: https://www.figma.com/design/miSY1sBxnsGIfjjUgx6Djp?node-id=7-2

## What to review

1. **Home:** compact search/account header, left topic sidebar, Continue watching, recommendation cards, and a short-video shelf.
2. **GPU topic:** broad subject navigation with smaller topics beneath it, related subject tags, video playback immediately above its chosen result, and chat on the right.
3. **Short videos:** vertical video, save/ask actions, navigation to the next video, return to the topic, and a related-break prompt shown after active learning.

## Design choices

- Desktop width: 1440 pixels. White background, dark text, subtle gray controls, and a green Curiosity accent.
- Familiar YouTube layout, with Curiosity branding and learning features.
- Typography: Roboto, with compact labels and clear video titles.
- Every broad topic appears once in the sidebar. A selected topic reveals its smaller topics. Related tags do not create duplicate topic entries.
- A home recommendation is explainable: related to previous searches, trending in learning, or a new subject to explore. Searching a topic does not take over the entire home feed.
- Continue watching shows saved playback rather than a knowledge score.
- Thumbnail images, titles, creators, counts, and recommendations are illustrative design content, not verified live results. Photos are from Unsplash; no YouTube API calls were needed for this mockup.
- Saved for later is shown as a proposed navigation item; it is not already implemented in the app.
- The short-video break contains at most three related candidates and can be skipped. The prompt is illustrated on the Shorts review screen; in the product it appears only after 10–15 minutes of active learning.
- This is a static design review, not a connected app or fully wired interactive prototype.

## Files

`desktop-design.html` is a standalone design source with embedded images. It is separate from `src` and does not change the running application.

The layout is now implemented in the existing app. Search, topic grouping, chat limitations, playback saving, and account access rules are retained. Home video data comes from a separate YouTube feed route described below.

## Design verification

The three Figma screens contain editable text, vector icons, layout frames, and component instances. Images are individual thumbnail photographs, not screenshots of the whole interface. Headers and video/short cards have reusable components, with illustrative content variants. All rendered text uses Roboto. Figma screenshots were inspected; card sizing and row layout issues introduced by component conversion were corrected, and the corrected screenshots were checked. No application tests were needed because app code was not changed.


## Approved change and implementation — 2026-10-14

- The Figma Home tab strip was changed to **Trending**, then the illustrative user's saved subject groups. Removed All, For you, and the separate Trending in learning tab. A new app user sees only Trending; each broad subject appears once after a successful search. Returning guest and account topics populate the same strip.
- The Figma write returned the updated tab labels. Subsequent Figma reads reached the Starter plan MCP limit, so a fresh screenshot of this change could not be fetched. The earlier retrieved design references were used for implementation. The local HTML review source has the same tab change.
- Implemented the white desktop layout, header search and account controls, topic sidebar, thumbnail cards, Shorts shelf, inline long-video playback, chat column, and shared Continue watching list. Mobile uses a compact header and a drawer for the topic sidebar.
- Illustrative photo cards and invented creators are not included in the app. Cards use actual YouTube titles, channels, durations, and thumbnails. Static icons reuse the original vector assets that were used to author the Figma design; Figma's temporary asset endpoints did not return downloadable SVG data during implementation.
- Trending is this app's recent popular learning feed: Education-category YouTube searches for science, technology, and finance explanations, published in the past 30 days and ordered by views. Separate medium and short batches keep the feed balanced. This is not a copy of YouTube's official Trending chart, a content-quality review, or a guaranteed English-only feed.
- Recent-search suggestions use at most two saved queries. Provider results are cached in server memory for ten minutes, capped at 50 entries. Each cache miss reserves the existing daily search allowance; Trending reserves two searches. Search and the feed remain separate, so opening a topic does not replace all Trending results.
- Saved for later and the mockup's manual Save action remain proposals for later work. The sidebar contains working Home, Short videos, Continue watching, topics, and Ask a question actions. Playback saving is automatic. Captions stay outside the official embedded player so its controls remain visible.
- The mockup's topic counts indicate explored searches, not proof of knowledge. Optional quizzes and knowledge scores remain out of scope.

## Checks for the implementation

- Production build and TypeScript checks pass.
- 26 rule/service/configuration checks and nine simulated browser journeys pass, covering the new topic bar, Home navigation, thumbnails, mobile sidebar, empty/error states, playback restoration, Shorts replacement, topic grouping, break behavior, and account isolation.
- A live YouTube feed request and live search were checked through the new local server on a temporary port because the founder's existing server was still running the older routes. Desktop and mobile screenshots were inspected. Simulated account/player checks do not establish live account-progress sync or real autoplay on every browser.
- Restart the existing local dev process to load the new backend. Account video progress still requires the previously supplied `002_video_progress.sql` migration and ownership check, if not already run.

The final balanced provider adapter returned 20 live videos. A subsequent request through the full home route was blocked by the existing local daily allowance; its counter was already 40. That limit was not raised or reset. The app now names this limit explicitly. Restarting loads the code but does not reset the daily allowance.


## Penpot selected for future design work

The founder requested migration of all three screens to Penpot and Penpot-only design work going forward. The migration was completed on 2026-10-14 in **New File 1 → Curiosity — Desktop**. Home, GPU topic, and Shorts have native editable text, vector icons, and individual thumbnail fills. Four reusable components were added. All screen and component previews were inspected, file validation passed, and a named version was saved. See [the transfer handoff](../penpot/README.md) for IDs and reconstruction limitations. The saved approved HTML supplied the design source; the rate-limited Figma server was not used.

## Universe navigation proposal — awaiting founder design review

Latest product decisions replace the earlier broad-category navigation for the proposed next version: **Science & Technology**, **Commerce & Business**, **Arts & Humanities**, named **Universes**. Trending stays first/default. Universe feeds open directly into videos with subject filters; search mixes results across Universes. Classified videos show **Universe – subtopic** above the thumbnail/player, with related-Universe tags for overlap. Unclassified results remain watchable. Future migration must preserve saved searches and playback progress; graph work is deferred.

Sixteen native Penpot review boards are on the separate **curiosity-desktop-universe** and **curiosity-mobile-universe** pages under names beginning **Universe ·**. Version: **Curiosity — Universe designs on separate pages**. Earlier approved screens remain on the original pages. The proposal is awaiting founder review; no application change or deployment was made. See [the handoff](../penpot/universes/README.md).

### Desktop Universe review refinement

Latest version: **Curiosity — Desktop Universe labels and seamless resume**. Desktop long-video labels now sit below the title and above the creator. Shorts remain unchanged. Clicking a previously watched video should load its saved playback position without a separate app Resume video button; a thin progress bar identifies watched examples. Mobile remains at its prior review stage. These are native Penpot design changes only; no app implementation or deployment was made. See the Universe handoff for verification and playback-policy details.

### Desktop Universe implementation

The latest desktop review is now implemented locally: three Universe feeds, subject filters, mixed search labels and normal-click saved playback. Shared video presentation options preserve existing mobile defaults. No public redeployment was made. See desktop-ui/features/universes/README.md for verification and remaining classification/autoplay limitations.
