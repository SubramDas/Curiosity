# Graph D refinement — Future discovery

## Desktop website integration

The founder asked how people reach the graph from the existing website. Three additional native boards now show **Home → Explore map → Map/Feed**, keeping the familiar white header and labeled sidebar. Open [the integrated desktop review](../desktop-integration/review.html) or [handoff](../desktop-integration/README.md). The original seven screens below remain for visual comparison.

Date: 2026-10-15. Status: founder selected Graph D's constellation + Map/Feed direction; this visual refinement awaits review.

## Review files

- [Clickable review](review.html): seven screen tabs, desktop/mobile views, and selected navigation hotspots.
- [Desktop map PNG](desktop-map.png) / [editable SVG](desktop-map.svg).
- [Desktop feed PNG](desktop-feed.png) / [editable SVG](desktop-feed.svg).
- [Mobile map](mobile-map.svg).
- [Mobile feed](mobile-feed.svg).
- [Connection preview](connection-preview.svg).
- [First-exploration achievement](achievement.svg).
- [Weekly spotlight](weekly-event.svg).

The original [Graph D](../d/review.html) remains available for comparison.

## Penpot location

File **New File 1**, page **Graph D2 · Future discovery**.

File ID: `129977ce-683b-806a-8008-c8f2a3fe903e`. Page ID: `c5f19b81-2139-8092-8008-cae7988375c9`.

Saved version: **Curiosity — Graph D futuristic refinement reviewed**. The precise board identifiers are in [penpot-boards.json](penpot-boards.json). The connector still does not expose the browser workspace URL; a direct file URL remains pending the founder's link.

## Visual direction

- Deep navy surfaces, cyan actions, violet concept connections and restrained gold event/achievement accents.
- Planet-like nodes with directional lighting, orbital selection rings, background stars and subtle ambient gradients.
- Native vector artwork for computing, neural networks and optics, keeping the content identifiable rather than using identical dots.
- A prominent selected topic and a quieter surrounding neighborhood establish where the learner is and what could come next.
- Large, clear action buttons and fewer competing accents keep primary actions visible.
- Topic details stay beside the desktop map; mobile uses a bottom sheet and a simpler neighborhood.
- Question-led feed cards give a concrete reason to open an item, such as “What colour is light, really?”

## What should invite a click

These are design hypotheses, not measured engagement results:

| Cue | Reason to explore | What opens |
| --- | --- | --- |
| GPU orb and selected panel | A clear starting point, a short duration and an intriguing explanation | Topic learning activity; playback remains illustrative |
| Neural networks node | “Why AI needs GPUs” explains a useful connection | A preview of the connection, before committing to an activity |
| Faint outer destination | A glimpse of another direction without requiring completion of earlier topics | Future concept discovery; the unknown-node control is illustrative |
| Featured feed question | A recognizable question with a specific learning promise | Related concept exploration |
| Weekly spotlight | A changing story connects the map to the outside world | Story detail with source/date fields and lasting concept links |
| First-exploration badge | Acknowledge a genuinely new exploration | Next destination choice or return to the current topic |

Avoid fabricated live-user counts, popularity claims, artificial locks or urgency. The event remains an explicitly illustrative story. Achievement means first exploration, without a quiz, mastery score or repeated award for the same topic.

## Prototype scope

In Penpot, desktop and mobile Map/Feed switches navigate between their boards. The desktop neural-network node opens the connection preview, with a close action. Weekly spotlight opens its detail and returns to the map. The discoveries pill opens the achievement example; its actions return to the map or preview the next connection. Feed map links return to the constellation.

The standalone review provides screen tabs and selected accessible hotspots for these examples. It uses native SVG exports with embedded Roboto fonts, covered by the [existing font license](../ROBOTO-LICENSE.txt). Most displayed controls are visual design elements; there is no live learning, news, playback, chat or map engine.

## Editability and verification

- Seven native Penpot boards with editable text, vector icons, orbital shapes, paths and gradients. No flattened screen images were imported.
- An **Explore action** library component was added as a reusable starting point; other screen elements are independently editable.
- Penpot PNGs of desktop map/feed, mobile map and achievement were visually inspected.
- All seven exported screens were rendered and visually inspected in a local contact sheet. Node labels were centered; the Feed rail selection was corrected.
- The standalone review's hash navigation was corrected during rendering so direct screen links and tabs show the intended state.
- Penpot validation returned no errors; text containment review found no text outside a review board.
- No application code, live Gemini/YouTube requests, tests or deployment were involved.

## Later implementation details

Keep any motion subtle: gentle selection feedback and short route reveals, with a reduced-motion alternative. Provide text labels for navigation icons, keyboard access, a topic-list alternative and at least 44px touch hit areas. Weekly publishing needs verified sources and dates. These behaviors require implementation and usability review after design approval.
