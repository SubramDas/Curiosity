# Playful learning map — design plan

Date: 2026-10-15. Status: concepts for founder review; no application implementation approved.

Technical implementation reference: [GRAPH_IMPLEMENTATION_PLAN.md](../../../GRAPH_IMPLEMENTATION_PLAN.md). The founder has since confirmed shared geography with personal discovery and a 30-second active-viewing achievement threshold; the technical reference records current decisions and separates proposed implementation defaults.

## Founder selection and refinement

The founder also requested a desktop entry/integration review. The proposed permanent **Explore map** sidebar button opens the graph within the existing header/sidebar shell. Home remains general discovery; the graph's Feed belongs to its selected Universe. Three additional boards show the clickable Home → Map → Feed journey. See [the desktop integration handoff](desktop-integration/README.md). This is a design proposal, not implemented application navigation.

The founder selected **Graph D: Constellation + Map/Feed** and requested a more futuristic and visually impressive experience. A separate native Penpot page, **Graph D2 · Future discovery**, now contains seven refined review screens. See [the refined handoff](d-refined/README.md) and [clickable review](d-refined/review.html). Original options remain available. Final visual approval and application implementation are pending.

## Confirmed direction

- Three Universes: Science & Technology, Commerce & Business, Arts & Humanities.
- Educational exploration blends videos, short discoveries, teacher help and useful topic connections.
- Users can start anywhere, search directly, and reveal nearby concepts gradually.
- Topics stay flat. Visual regions help orientation without adding nested topic menus.
- Each topic has a stable identity and primary home, with explained bridges to other Universes.
- Award an achievement when a learner explores a topic they have never explored before. No quiz or mastery requirement in this version.
- Show explored activity honestly; no percentage of a Universe known.
- Keep map locations recognizable as new concepts and weekly events arrive.
- Attach dated, sourced weekly events to lasting concepts. Example events in designs are illustrative, not verified current news.

## Four independent concepts to compare

| File / concept | Visual style | Universe entry |
| --- | --- | --- |
| A — Landscape / Map first | Geographic islands, landmarks, discovery trails | Map opens immediately; videos inside a topic panel |
| B — Landscape / Map + Feed | Same landscape | Persistent Map / Feed switch with both views illustrated |
| C — Constellation / Map first | Cosmic concept neighborhoods, stars and routes | Map opens immediately; videos inside a topic panel |
| D — Constellation / Map + Feed | Same cosmic map | Persistent Map / Feed switch with both views illustrated |

Separate Penpot pages and separate local SVG previews keep the options easy to review. The connected plugin supports editing the current file, not creating new workspace files. Actual Penpot links and export paths will be recorded in README.md after creation.

## Screens for each concept

- Desktop Science map with selected GPU topic, meaningful routes, nearby discoveries, Universe navigation, search, map controls and legend.
- Mobile map with topic bottom sheet, touch controls and list alternative.
- First-exploration achievement state, with next-destination choice and dismiss action.
- Weekly event detail with source/date placeholders and links to stable concepts.
- For B and D, a separate Feed state that preserves the same Universe and exploration context.
- Commerce and Arts use distinct visual regions in the Universe selector; Science supplies the detailed common example to compare styles fairly.

## Interaction rules proposed for review

- Pan / zoom / recenter; keyboard and list alternatives; reduce motion preference.
- Select a node to preview. Start an activity to explore. Merely panning or previewing does not earn an achievement.
- Confirmed trigger: 30 seconds of active video viewing on an eligible topic. Opening a node or launching playback alone does not unlock an achievement. See the technical plan for timing and synchronization rules.
- One first-exploration unlock per learner and canonical topic, shared across map and feed. Reopening or another video on that topic does not repeat it.
- Existing saved activity must be considered before calling a topic new. Guest/account merge behavior needs an explicit implementation decision.
- Newly discovered nodes are available by choice, with optional suggestions rather than mandatory prerequisites.
- Edge explanations distinguish factual relationships, useful next steps and checked prerequisites.
- Weekly examples show their publication/update dates and sources; archived events retain their concept connections.
- Achievement celebrates exploration only; no assessment, mastery score or streak pressure.
- Reduced-motion mode replaces animated reveal with a static highlight. Mobile touch targets should be at least 44px.

## Implementation work after design selection

- [x] Founder chooses visual style and Map-first versus Map/Feed entry: refined Graph D, constellation with Map/Feed.
- [x] Confirm the exploration threshold: 30 seconds of active video viewing.
- [ ] Implement the exact timing protocol and deliberate handling of existing topic activity.
- [ ] Define stable topic, named edge, event, discovery and unique achievement records.
- [ ] Build a small reviewed graph neighborhood per Universe, with sources and stable node positions.
- [ ] Reuse Gemini/Wikidata classification; do not treat Wikidata relationships as automatic prerequisites.
- [ ] Prepare and cache shared content outside learner navigation, respecting the existing sequential Gemini scheduler and quotas.
- [ ] Build desktop/mobile map, accessible list, topic panel and activity entry using existing video/teacher features.
- [ ] Store learner discovery and achievements with server ownership checks and deduplication.
- [ ] Add weekly event draft/review/publish/archive workflow with dates, sources and corrections.
- [ ] Handle empty maps, unavailable videos, source failures, unsaved progress and reduced motion.
- [ ] Review chosen design in Penpot before application changes.

## Design handoff requirements

Native editable text and vector graphics; reusable design components; separate concept exports; real Penpot page links; visual inspection of every review board. Static illustrative designs do not establish working feeds, playable videos or live news.
