# Search guardrails — design review

Desktop implementation is now prepared locally following founder authorization. The existing application shell surrounds the shared search states, and selecting a result opens the existing player/teacher workspace. Mobile implementation remains pending. See [runtime behavior and verification limits](../../../backend/search/README.md). Earlier design-only status below records the original handoff.

Status: native Penpot designs prepared for founder review on 2026-10-17. No application behavior, provider settings, database or deployment changes.

## Open in Penpot

File: **New File 1**, ID `129977ce-683b-806a-8008-c8f2a3fe903e`.

- **Curiosity — Search · Desktop**: 13 boards, 1440 × 1000.
- **Curiosity — Search · Mobile**: 13 boards, 390 × 960.
- Saved version: **Curiosity — Search guardrails review**.

The founder explicitly chose new pages in this existing file after the connector's lack of workspace-file creation was explained. Original design pages were preserved. The connector does not expose the authoritative workspace/share URL; no link is fabricated. File/page/board identifiers are recorded in `design-report.json`; the actual file URL remains to be supplied.

## Agreed behavior represented

- Ordinary search supports learning across subjects, including funny educational explanations.
- Broad searches such as Football offer learning choices: rules, tactics and history.
- Pure entertainment searches redirect to useful learning angles, without an unrestricted continue-anyway action.
- Users can clarify a legitimate learning goal while retaining the original query.
- Ordinary results focus on education. AI filtering is not a guarantee of accuracy or educational quality.
- Existing breaks remain limited to up to three topic-related entertainment candidates. They need not teach something. This review explains that distinction without redesigning the existing break flow or offering an immediate entertainment bypass.

## Screens and prototype

Eight main states on each page: start, checking, learning-angle choices, entertainment redirect, learning-goal clarification, learning results, no suitable results and unavailable check. Five additional contextual result screens cover football rules/tactics/history, psychology of humor and comedy timing.

From Start, select the Football or Funny videos example to review the corresponding flow. Choice cards lead to contextual result examples. Change search, Back to search and the brand return to Start. The checking example advances to GPU learning results after a short illustrative delay. Only representative navigation is prototyped; text entry, generated choices, real result filtering, playback and provider calls are not implemented.

The white shell, green accent, Roboto typography, Universe navigation, separate video thumbnails and mobile navigation follow the existing app/design direction. Thumbnails and titles are illustrative. Contextual football/humor thumbnails and GPU explanation diagrams use editable vectors. Text is native, and a local **Search / Primary action** component provides a reusable starting point. Most review shapes remain independently editable.

## Verification and source

- Representative desktop/mobile choice, redirect, goal and result PNG exports were visually inspected. An initial Roboto Mono mismatch and crowded mobile copy were corrected; corrected mobile previews were inspected.
- All 26 boards were checked structurally for bounds and linked-control presence. Penpot file validation returned no errors, and a named version was saved.
- Whole-page export was unavailable; individual-board exports supplied visual evidence. Other states received structural checks rather than individual visual inspection.
- A bulk correction timed out. Subsequent inspection confirmed all recorded desktop/mobile text corrections completed. Direct page shape lookups were used for final corrections and checks.
- `create-search.js` preserves the base generation source. `refine-search.js` records contextual result/vector/prototype refinements. The saved native Penpot version is authoritative: later font, copy and thumbnail corrections are not a complete replayable snapshot in these scripts. Do not rerun them blindly over the existing review.
- No YouTube/Gemini calls, application tests, migrations or deployment were performed for this design task.

The next step is founder review before implementation. Backend query checks, result filtering, caching, queue behavior and secure separation of break requests remain implementation work.
