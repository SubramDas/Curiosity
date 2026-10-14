# Universe navigation review

Status: ready for founder review in Penpot. Saved version: **Curiosity — Universe designs on separate pages**. Seven desktop and nine mobile review boards are native and editable. Application code and deployment are unchanged.

Open the connected **New File 1**. The new boards begin with **Universe ·**:

- **curiosity-desktop-universe:** seven desktop review boards, starting at the page origin.
- **curiosity-mobile-universe:** nine mobile review boards, starting at the page origin.

Connected file ID: `129977ce-683b-806a-8008-c8f2a3fe903e`. The MCP API does not provide the authoritative workspace/share URL; none is fabricated here.

## Agreed product decisions

- Name the three top-level groups **Universes**.
- **Science & Technology**, **Commerce & Business**, **Arts & Humanities**.
- Trending remains the default, followed by the three Universes.
- Open each Universe directly into videos with subject filters; no mandatory subject-folder step.
- Search accepts any topic and presents relevant videos from all Universes together.
- On desktop, classified long videos show **Universe – subtopic** below the video title and above the creator name. Desktop Shorts and the mobile proposal retain their current label placement. Unclassified videos remain available without a fabricated label.
- One primary Universe per video/search; related-Universe tags explain overlap without duplicating saved entries.
- Future implementation must preserve existing searches and playback positions when moving saved topics into Universes.
- Knowledge graph design and learning/understanding measures are deferred. Viewing must not be described as verified understanding.

## Review coverage

Seven desktop screens: Trending, the three Universe feeds, mixed search results including an unclassified result, inline playback with teacher, and Shorts.

Nine mobile screens: the same seven, a Your Universes screen linking directly to feeds, and a 320-pixel Trending example. Main phone examples are 390 pixels wide. Feed boards include scrollable-content examples; actual scrolling and responsive behaviour require implementation. The prototype provides representative navigation, not real searches, playback or swipe gestures.

The approved header, green accent, Roboto typography, vector icon style and separate thumbnail assets supply the visual starting point. All thumbnails, creators, titles, durations and relationships are illustrative. Earlier account/chat/error boards remain available as the approved references for unaffected flows.

Penpot file validation returned no errors. Six representative previews were inspected: desktop Trending and mixed search, mobile Science & Technology after contrast/wrapping fixes, Your Universes, Shorts and 320-pixel Trending. The other screens were checked structurally. Final native edits also changed the desktop Shorts shelf to portrait thumbnails and moved Shorts labels above the player. A fresh final desktop shelf PNG export returned no image, so that last shelf change was checked structurally. Board IDs and current dimensions are recorded in `design-report.json`.

`update-design.js` is the connected Penpot generation source. It supports explicitly selected batches through plugin storage and retains boards carrying its own review keys. Do not run it blindly over an existing review: inspect partial work and match the recorded board IDs first. Final native refinements must be recorded separately; this generator is not a complete snapshot of later changes.

## Separate pages for developers

The founder requested separate Universe pages to avoid confusing the earlier approved designs with this proposal. All sixteen Universe boards are now on the two pages named above; no Universe boards remain on the original Desktop or Mobile pages. Existing earlier designs remain there.

The Penpot API does not support directly moving boards between pages. Native editable layers were recreated on the destination pages, verified against source text and shape counts, and then the source Universe boards were removed. Board IDs therefore changed; `previousId` records the mapping. All 238 prototype links were reconnected. Geometry and flip flags were checked, desktop/mobile previews inspected, file validation passed and a named version was saved. An unrelated broken flow was left untouched.

## Desktop review: labels and saved playback

The latest desktop review version is **Curiosity — Desktop Universe labels and seamless resume** on **curiosity-desktop-universe**. The mobile review has not changed.

- Long-video cards and the selected player use this order: thumbnail/player, video title, Universe – subtopic, creator name. Thirty-one desktop labels were moved; Shorts labels and layout were retained.
- Partially watched GPU examples show a thin playback-progress bar on Trending, Science & Technology and search results.
- A normal video-card click opens playback at the last saved position. There is no separate app Resume video button. The illustrative player shows resumed playback at 2:18 of 6:24. Official YouTube controls remain available. In implementation, browser playback policies still apply; the saved position must remain loaded even if the browser requires its player control to start playback.
- Playback saving and resumed start behaviour are design requirements, not an implemented app change in this review.
- Desktop Trending and the watch screen were visually inspected; Penpot file validation returned no errors. Application code and deployment remain unchanged.

The native review edits are documented by `reviews/desktop-labels-and-resume.js`. The base generator predates this review and must not overwrite the current boards.

## Desktop implementation

The founder authorised desktop implementation after reviewing label placement and saved playback. The desktop Universe feeds, filters and metadata order are now implemented locally. Mobile Universe implementation remains pending. Existing stored topic keys and playback positions are retained through display mapping; no SQL migration is needed. See [the implementation guide](../../../desktop-ui/features/universes/README.md) for the provisional classification rules, checks, browser playback limitation and local-only deployment status.
