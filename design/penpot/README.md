# Penpot design transfer

## Revelink Orbit Book refinement — 2026-10-18

The founder chose Open Book + Discovery Orbit. Three new **Revelink · Orbit Book ·** boards on **Revelink — Brand explorations** show the combined symbol with wordmark/tagline, a desktop header preview, and small/light/dark/app-icon versions. The play triangle is replaced by the open book. All three final previews were inspected, validation passed and **Revelink — Orbit Book logo refinement** was saved. Native reusable component and transparent SVG master are included in [the refinement handoff](revelink/ORBIT_BOOK.md). Application branding awaits approval of this refinement.


## Revelink brand explorations — 2026-10-18

A new **Revelink — Brand explorations** page in **New File 1** contains four editable logo/wordmark directions: Connected Play, Open Book, Linked R and Discovery Orbit. Three review boards show the approved tagline, desktop header replacements, small app/browser icons and versions on dark backgrounds. Connected Play is the recommended direction; founder selection remains pending. All three final previews were inspected, validation passed, four reusable symbol components were created and **Revelink — Logo and wordmark explorations** was saved. See [the brand handoff](revelink/README.md).


## Desktop related Universe popovers — 2026-10-18

Three native **Related Universes ·** boards were added only to **New File 1 → curiosity-desktop-universe**: collapsed +N, +1 open and +2 open at the right edge. They propose readable related-Universe names in an anchored popover, with Close/outside dismissal and stable title/creator positions. All exported previews were inspected, validation passed and **Curiosity — Related Universe popovers** was saved. The founder approved desktop implementation, now prepared locally with keyboard/outside dismissal, viewport positioning and stable metadata. Mobile retains its current control. See [the design handoff](related-universes/README.md).


## Desktop Watch history review — 2026-10-18

Three native **Watch history ·** boards were added under **New File 1 → curiosity-desktop-universe**. The history screen shows Resume actions with saved times/progress for unfinished videos and Shorts, plus Watch again for completed videos. Linked long-video/Short boards illustrate resuming at the saved position. All previews were inspected, validation passed and **Curiosity — Watch history and Resume actions** was saved. The founder approved desktop implementation, now prepared locally with saved-time Resume, completed-video replay, day grouping and paginated history. Mobile remains unchanged. See [the handoff](watch-history/README.md).


## Desktop teacher readability — 2026-10-17

Five native **Chat ·** review boards were added under **New File 1 → curiosity-desktop-universe**: readable answer, long answer, video thumbnails, expanded reading and earlier-message/new-answer behavior. All previews were inspected, file validation passed and **Curiosity — Desktop teacher readability and video cards** was saved. The founder approved the desktop design, now implemented locally with readable answers, stable scrolling, thumbnail cards and expanded chat that preserves playback. See [the chat handoff](chat/README.md).

## Search guardrails review — 2026-10-17

New native review pages in **New File 1**: **Curiosity — Search · Desktop** and **Curiosity — Search · Mobile**. Twenty-six boards show search choices, entertainment redirects, goal clarification, learning results and failure states within the existing layout. Saved version: **Curiosity — Search guardrails review**. The founder approved desktop implementation, which is now prepared locally; mobile implementation remains pending. See [the Search handoff](search/README.md) for the policy, prototype, board IDs and verification limits.

## New review: playful learning graph

Latest desktop review: **Explore map** below Home in the existing sidebar, with the white header/sidebar retained around the dark graph. Three additional native boards on **Graph D2 · Future discovery** show Home → Map → Feed. Open [the integration review](graph/desktop-integration/review.html) and [handoff](graph/desktop-integration/README.md).

The founder selected Graph D and requested a visual refinement. The separate **Graph D2 · Future discovery** page now contains seven futuristic concept screens, with orbital concept nodes, a question-led feed, mobile layouts, connection previews, achievements and a weekly spotlight. Open [the refined review](graph/d-refined/review.html) or [handoff](graph/d-refined/README.md). Application implementation awaits design approval.

Four graph concepts are ready on separate **Graph A–D** pages in the connected file: Landscape/Constellation crossed with Map first/Map + Feed. There are 20 review screens with desktop/mobile layouts, exploration achievements and weekly event examples. Separate local review files are linked in [the graph handoff](graph/README.md); the scope and implementation checklist are in [the graph plan](graph/PLAN.md). The founder has approved first-exploration achievements without quizzes; visual style and Universe entry remain for selection. These designs have not been implemented in the app.

Status: transferred and checked in Penpot on 2026-10-14.

Open **New File 1 → Curiosity — Desktop** in the connected Penpot workspace. It contains Home, GPU topic, Shorts, and a Reusable components board. The Home screen retains Trending followed by the user's searched subjects.

Destination file ID: `129977ce-683b-806a-8008-c8f2a3fe903e`. Page ID: `129977ce-683b-806a-8008-c8f2a3fe903f`. Full board and component IDs are recorded in `migration-report.json`. The MCP API does not expose the workspace's public/share URL; use the connected file in Penpot.

The three screens contain 106, 80, and 49 native editable text layers, all using Roboto. Icons are native vector groups; thumbnails are individual image fills with their aspect ratio preserved. Headers, sidebar sections, and topic tabs are grouped. The local component library includes signed-in and signed-out headers, a continue-watching video card, and a short card.

All three screen previews and the component preview were inspected. Penpot file validation returned no errors. A version was saved as **Curiosity — approved desktop design migrated from Figma**.

The founder selected Penpot for all future design work. The Figma file remains an archive of the earlier review. Do not use Figma MCP for new edits unless the founder requests it.

## Screens

- `1-home.svg`: Home, including Trending followed by the illustrative user's searched subjects.
- `2-gpu-topic.svg`: GPU topic, video player, related results, chat, and break example.
- `3-shorts.svg`: Shorts screen with topic context and related-break example.

These exports are reconstructed from the saved design source in `../review/desktop-design.html`, including its approved tab update. They contain SVG text, rectangles, vectors, and individual embedded thumbnail images; they are not screenshots of entire screens. They are not native `.penpot` files and do not retain Figma component IDs or library links.

`design-layers.json` contains screen dimensions and individual layer properties for rebuilding native Penpot shapes. The six original thumbnail assets are in `assets/`. Importing the SVGs alone does not establish that Penpot has retained editable text or recreated reusable component relationships; that must be checked in Penpot.

## Future editing

### Mobile proposal

The separate **Curiosity — Mobile** page now contains 29 editable boards for phone layouts and learning/account/error flows. Desktop boards remain unchanged. See [the mobile handoff](mobile/README.md) for scope, responsive rules, review status, and IDs. The mobile proposal is saved in Penpot as **Curiosity — mobile review ready**; it has not been implemented in the application.

Keep the destination file and MCP Plugin connected while using Penpot tools. Never put the connection token in this repository or share it in conversation. Use the native Penpot boards for future edits; the local SVGs preserve the initial transfer source.

This was a reconstruction from the saved approved design, rather than a direct Figma file conversion. Figma IDs and library links were not preserved. The new local components provide reusable starting points; existing cards are independently editable and are not all instances of one shared component. Videos and chat shown in these designs are illustrative.

## Regenerate exports

From the project root, with dependencies installed:

```bash
node design/penpot/export-design.mjs
```

The exporter uses the existing Playwright dependency and Chrome installation. It makes no YouTube or AI API requests. All three generated SVGs passed XML validation; they contain 106, 80, and 49 text elements respectively.

## Latest review: Universes

The founder agreed on Science & Technology, Commerce & Business, and Arts & Humanities as the three **Universes**, with Trending as default. The native boards named **Universe ·** now live on the separate **curiosity-desktop-universe** and **curiosity-mobile-universe** pages. Open the saved version **Curiosity — Universe designs on separate pages**. See [the Universe review handoff](universes/README.md) for the sixteen boards, agreed behaviour, verification and review status. The deployed app has not changed for this proposal.
