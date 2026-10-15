# Graph concepts — founder review

## Selected direction: Graph D, refined

The founder selected constellation styling with Map/Feed navigation and requested a more futuristic treatment. Open [Graph D refined](d-refined/review.html) for the seven-screen review, or [the handoff](d-refined/README.md) for rationale and scope. Native Penpot page: **Graph D2 · Future discovery**. The original four concepts remain below for comparison.

Date: 2026-10-15. Status: four design proposals created in Penpot; awaiting selection.

## Open the designs

Start with [the comparison gallery](index.html), then open a separate review file:

| Concept | Style | Navigation | Separate review file |
| --- | --- | --- | --- |
| A | Landscape | Map first | [A review](a/review.html) |
| B | Landscape | Map + Feed | [B review](b/review.html) |
| C | Constellation | Map first | [C review](c/review.html) |
| D | Constellation | Map + Feed | [D review](d/review.html) |

Each concept has desktop/mobile maps, a first-exploration achievement screen and weekly event detail. B and D additionally have desktop/mobile feeds: **20 review screens total**. Each screen is a separate SVG file with embedded Roboto fonts and editable text. [Roboto license](ROBOTO-LICENSE.txt); font files were retrieved from Google's font CDN using the URLs supplied by Penpot.

## Penpot location

Connected file: **New File 1**, ID `129977ce-683b-806a-8008-c8f2a3fe903e`.

Separate pages:

- **Graph A · Landscape — Map first**
- **Graph B · Landscape — Map + Feed**
- **Graph C · Constellation — Map first**
- **Graph D · Constellation — Map + Feed**

Saved version: **Curiosity — Four exploration graph concepts for review**.

The connector can edit pages of the connected file but cannot create separate workspace files or expose the current browser URL. The founder was asked for the actual file URL; direct workspace links remain pending. These are four separate Penpot pages and four separate local review files, not four separate Penpot workspace files. The full page/board identifiers are in [penpot-boards.json](penpot-boards.json).

## What to compare

1. Landscape versus constellation: which feels more inviting and easy to understand?
2. Map first versus persistent Map/Feed switch: which entrance should a Universe use?
3. Topic panel: is it clear what to explore and where the connection leads?
4. Achievement: celebrate a learner's first exploration of a topic, without a quiz or mastery requirement.
5. Weekly discovery: dated, sourced stories connect to lasting topics. The example is illustrative.

Science supplies the common detailed example so the alternatives can be compared fairly. Commerce and Arts appear in the Universe selector; their full maps remain future design work after selection.

## Prototype and editability

- Native Penpot text, paths, circles and surfaces. Screens are not flattened images.
- Reusable **Graph / First exploration badge** and **Graph / Weekly discovery** library components, with a building-block board on page A. Most review screen elements remain independent editable shapes.
- Desktop Map/Feed navigation is linked for B and D; the mobile Feed button and its return to Map are linked too.
- Desktop weekly event button opens its detail; its back link returns. My discoveries opens the achievement example, which can return to the map.
- Exploration, video playback, teacher responses, map pan/zoom, source links and progress persistence are illustrative controls, not implemented behavior. The achievement is a preview state, not a real earned award.

## Verification and limitations

- Penpot PNG renders were inspected for the landscape desktop, constellation desktop and constellation mobile.
- All 20 exported screen previews were rendered and visually inspected in local contact sheets. Crowded mobile labels, zoom positioning, default path outlines and a desktop header overlap were corrected.
- Standalone SVGs embed the Roboto font to avoid a serif fallback outside Penpot.
- Penpot file validation returned no errors, and a named version was saved.
- This is design work only. No application build/tests, Gemini calls, YouTube requests or deployment were run for this task.
- Achievements are agreed at product level; the precise activity/playback threshold remains a proposed implementation detail in [PLAN.md](PLAN.md).

## Next decision

Choose A, B, C or D, or mix the preferred visual style with refinements. Review the [plan](PLAN.md) before implementing data records, the map, discovery tracking and weekly publishing.
