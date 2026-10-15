# Desktop website → Explore map

Date: 2026-10-15. Status: navigation integration proposal, ready for founder review. No application code changes.

## Open the flow

Start with [the clickable review](review.html): **Home → Explore map → Map / Feed**.

Separate screens:

1. [Home entry PNG](home-entry.png) / [editable SVG](home-entry.svg).
2. [Graph inside the website PNG](website-map.png) / [editable SVG](website-map.svg).
3. [Universe feed inside the website PNG](website-feed.png) / [editable SVG](website-feed.svg).

These are 1600 × 1080 wide-desktop review boards. Narrower desktop responsiveness remains implementation/design follow-up.

## Navigation decision shown

- Add **Explore map** immediately below **Home** in the existing labeled sidebar.
- Retain the white header, global search, account control and sidebar. Place the futuristic dark graph in the main content area.
- Keep **Short videos**, **Continue watching**, **Your Universes** and **Ask a question** visible.
- Home remains general discovery. The graph's **Feed** is scoped to the selected Universe.
- Switching Map/Feed keeps **Explore map** selected in the sidebar and retains Universe context.
- Home returns to the existing general discovery screen.
- A proposed discovery card on Home offers a second entry; the permanent sidebar button is the primary entry.
- On first entry, propose Science. On return, restore the last Universe and map position. The static review shows Science; persistence is not implemented.
- Existing Universe sidebar destinations retain their ordinary browsing role; this review does not implement or reroute them.

The proposed **View this topic on the map** link from a video remains documented direction, not a fourth screen in this review.

## Penpot

File: **New File 1**. Page: **Graph D2 · Future discovery**.

- **D2.10 · Website integration — Home entry**
- **D2.8 · Website integration — Explore map**
- **D2.9 · Website integration — Universe feed**

Saved version: **Curiosity — Website entry and integrated graph navigation reviewed**.

The page now contains the seven earlier refined concepts plus these three integration boards. Board IDs are in [penpot-boards.json](penpot-boards.json). The connected plugin still does not provide the browser URL; use the recorded page/board names in the connected file.

## Design construction and review

- Native editable text, vectors, shapes and gradients; graph content reuses the refined Graph D design.
- The white shell follows the current desktop header/sidebar code and its 68px header / 224px sidebar dimensions. Labels match the application. Sidebar icons use native design vectors and remain visual approximations of the current icon assets.
- Home reuses individual illustrative thumbnail image fills from the earlier Penpot desktop design. Images and titles are mock content, not fetched videos.
- Penpot links connect Home/sidebar/card → Map → Feed and Home again. The standalone review has keyboard-accessible tabs and labeled navigation hotspots.
- Native Home and exported Map/Feed renders were visually inspected. A missing cloned canvas was corrected before final export.
- Standalone SVGs embed Roboto using the existing [font license](../ROBOTO-LICENSE.txt).
- Penpot validation returned no errors. No application tests, provider requests or deployment were run.

Other controls are illustrative. Live graph data, learning activities, sidebar routing and position persistence await implementation approval.
