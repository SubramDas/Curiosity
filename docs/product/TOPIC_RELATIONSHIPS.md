# Topic relationships and broad topic tiles

## Graph implementation prepared — 2026-10-15

The local graph feature, migration, catalog publication tooling and 30-second activity paths are now prepared. The 30-topic/26-edge starter remains a review draft without published videos or news. Activation requires applying the schema, reviewing/publishing content and enabling the feature; no deployment or live database/playback verification was performed. See [the implementation handoff](../../backend/graph/README.md).

## Confirmed graph foundation — 2026-10-15

The founder confirmed a shared published map with personal discovery/progress and a first-exploration achievement after 30 seconds of active video viewing. Playback position alone is not active time. The technical implementation reference is [GRAPH_IMPLEMENTATION_PLAN.md](../planning/GRAPH_IMPLEMENTATION_PLAN.md), including module boundaries, schema, API contracts, identity/access handling, publishing, implementation phases and future verification. Accumulation across clips and the other explicitly labeled defaults remain implementation proposals; no graph code or migration is introduced by the plan.

## Exploration graph direction — 2026-10-15

The founder now requests a game-like map across the three Universes, with gradual discovery, concept connections and weekly educational event additions. Achievements should celebrate first-time exploration of a topic; learner quizzes and mastery requirements are not part of this version. Flat topics, primary placement and related-Universe bridges remain. Four visual/navigation concepts are prepared in Penpot for selection. See [the graph plan](../../design/penpot/graph/PLAN.md) and [design handoff](../../design/penpot/graph/README.md). The exploration trigger and news publishing workflow are proposals pending implementation decisions.

Date: 2026-10-13  
Status: one main tile with related-topic tags is agreed. External knowledge sources are included in the build plan. Final category names and integrations are not implemented yet.

## What the founder proposes

Keep a small number of broad tiles. Smaller related topics and their video results go inside them. When a user searches again, identify the topic, find its broader subject, and reuse the existing tile instead of creating a new tile for each search.

Examples:

- Computing: GPUs, CPUs, Nvidia, AMD, RTX, ray tracing, DLSS.
- Money and Business: accounting, chartered accountancy, income tax.

The founder asks whether all internet topics can fit into a finite set of groups, and whether an existing graph already connects those topics.

## Answer 1: a finite number of headings is possible

The app can choose a fixed number of broad headings and place growing numbers of smaller topics inside them. The number of headings is a product choice, not a discovered universal number of subjects.

There is a trade-off: very few headings can become vague or crowded; many headings can recreate tile clutter. Use smaller sections inside each tile and test whether users understand the labels.

Examples of proposed broad headings, not yet agreed:

1. Computing and Technology
2. Money and Business
3. Science and Mathematics
4. Health and Medicine
5. Society, History and Law
6. Language and Communication
7. Arts and Media
8. Everyday Life and Practical Skills
9. General or Unsorted

Sports, engineering, education, and other areas need deliberate placement or additional headings as the app grows. This list is a starting illustration rather than proof that nine headings are enough for every search.

A fixed menu does not require every topic to have been discovered in advance. Unknown searches can go temporarily into General/Unsorted while video search continues. Keep that fallback visible and review it so it does not become a dumping ground.

## The groups will overlap

Topics do not form clean, isolated islands:

- Nvidia GPU architecture belongs mainly in Computing.
- Nvidia stock valuation belongs mainly in Money and Business.
- Tax on imported GPUs connects hardware, business, and law.
- AI in medical imaging connects computing and medicine.

Founder decision: keep each saved smaller topic in exactly one main tile. Show other relevant subjects as small “Related to” tags beside its heading. These tags are links, not additional copies of the topic or its videos. Shared knowledge records may describe several subject connections, but each saved topic entry has one home.

A connection is not enough to determine placement. GPU → Nvidia → company → stock market is a real chain of ideas, but it should not put all GPU learning into Finance. Only chosen relationship types should determine category placement.

## Connections need names

GPU, Nvidia, and CPU are different kinds of things. A chain alone hides this distinction.

| Example connection | What it means |
|---|---|
| GPU → Computing | Belongs in this subject for our app |
| GPU → CPU | Related hardware concepts to compare |
| Nvidia → GPUs | Company associated with designing GPU products |
| RTX → Ray tracing | Product/technology relationship that requires a precise description |
| Income tax → Taxation | Smaller subject within a larger subject |
| Taxation → Money and Business | Main app category, with possible related law links |
| A prerequisite topic → A later topic | Something useful to learn first; must be checked separately |

Keep “belongs under,” “related to,” and “learn first” separate. A factual connection does not automatically say what a beginner should study next.

## Answer 2: large existing graphs are useful starting material

### Wikidata

Wikidata offers broad structured data, entity names, identifiers, and relationships. Its structured data is available under CC0. It can help identify a topic and retrieve selected relationships; it does not provide our exact home tile rules or a ready-made learning path. [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access).

Wikidata distinguishes types of relationships, including subclass versus instance. Importing every relationship as an ordinary “related topic” link would lose meaning. [Wikidata subclass explanation](https://www.wikidata.org/wiki/Property:P279).

### DBpedia

DBpedia supplies a broad knowledge graph and a vocabulary for relationships across subjects. It is another candidate source; coverage, dataset licenses, access method, and update process need checking before reuse. [DBpedia](https://www.dbpedia.org/).

### Library classifications

Dewey illustrates organizing knowledge into ten main classes with narrower divisions. It is a classification system, not a complete graph of every concept. Its categories need not match the best labels for this app; review permission before copying protected classification material. [OCLC Dewey summaries](https://www.oclc.org/content/dam/oclc/dewey/resources/summaries/deweysummaries.pdf).

No source checked in this discussion establishes a complete, correct, ready-to-use graph of every internet topic and every useful relationship. New topics, informal phrases, ambiguity, missing links, and source errors still need handling. Imported facts also need mapping to our own category and learning rules.

## Recommended design

Use one shared collection of topics and relationships, displayed as smaller subject maps inside broad tiles. Separate maps are useful views; they do not need separate databases that duplicate cross-subject concepts.

1. Define a small set of broad headings for the first release.
2. Give each known topic a stable identifier, alternate names, named relationships, and candidate subject connections. Give each saved topic entry exactly one main tile and separate related-tile tags.
3. Identify what the full search means, not just whether it contains a known word. “Nvidia shares” and “Nvidia GPU architecture” have different intentions.
4. Use checked local mappings and selected Wikidata relationships. Evaluate DBpedia for missing useful information; use Dewey as a reference when designing broad headings. Record source and reliability, check reuse permissions, and avoid importing an entire dataset initially.
5. When classification is uncertain, ask a brief clarification or use a temporary unsorted category. “CA” may mean chartered accountant, California, or another meaning depending on context.
6. Choose one primary tile for that search. Reuse the existing user tile for that category.
7. Save the original query, interpreted smaller topic, primary category, useful secondary links, video references, and viewing activity.
8. Keep videos as references and allowed metadata, not downloaded copies. Observe the provider's refresh/deletion rules.
9. Reopen the saved tile on a later visit and show its smaller topics, recent searches, watched videos, and further available results.
10. Permit staff to correct wrong category mappings and retain the original decision history. End-user tile editing remains optional later as the founder requested.

Graph lookup alone cannot classify every unfamiliar phrase. Query interpretation, category rules, and an honest unknown-topic path remain necessary.

## Progress without mandatory learner tests

For the current first version, show explored topics, watched activity, saved interests, and nearby topics not yet explored. Suggested wording: “You explored 6 computing topics.”

Do not present this as “you know 60% of Computing.” Knowing what someone watched does not establish understanding; we also do not have a complete denominator for all knowledge in a broad subject.

Later optional understanding checks can add dated evidence to selected concepts. They still do not measure a user's knowledge of the universe.

## Work to add to the developer plan after category choices

- Define category labels and example search-to-category mappings.
- Keep one main tile per saved smaller topic, with secondary subjects shown only as related tags.
- Name relationship types and distinguish category placement from recommendations and prerequisites.
- Import a small, useful selection of external graph data with source details; avoid copying a whole graph initially.
- Handle ambiguous abbreviations, mixed-subject searches, new topics, and incorrect links.
- Reuse tiles by stable category identifier, not by spelling of the user's query.
- Build subject map views from shared records and show visited activity without mastery claims.
- Test GPU/AMD tile reuse, Nvidia-stock placement, GPU-tax cross-links, and ambiguous CA searches.

These tasks are now included in the developer plan. The final category list and external-source connections still need implementation and testing.


## Agreed display rule — 2026-10-13

Example:

```text
Tile: Money and Business

Income tax on GPU imports
Related to: [Computing] [Law]

Videos and viewing activity stay in Money and Business.
```

- The full query determines the smaller topic: Nvidia GPU architecture and Nvidia stock valuation are separate learning topics even though both mention the company Nvidia.
- Repeating the same topic should reopen its saved entry rather than create a duplicate in another tile.
- Clicking a related tag opens the other subject or a related-topic view. It must not automatically copy/move the current topic, create a new saved tile, or change the user's active learning session.
- A tag may refer to a subject the user has not saved. That subject can be previewed; save a new tile only when the user starts a search/exploration there.
- Tags should represent a direct, useful connection. A long chain connecting GPU → company → stocks does not justify attaching Finance to every GPU topic.
- Do not automatically reassign existing saved topics whenever an external source changes. Staff corrections need a recorded reason and preserved history.

Suggested interface details, not additional founder commitments:

- Show at most two related tags next to the heading, with “+ more” when needed, to keep headings tidy.
- Give each tag a brief explanation, such as “This topic also involves import law.”
- Offer “Why is this here?” to explain the main tile choice.
- Use a clarification for ambiguous terms before saving a confidently wrong category.
- Count each explored topic once overall. Related tags do not increase progress counts in other tiles.

## External sources added to the plan

1. Wikidata: first source for stable topic identities, alternate names, and selected connections.
2. DBpedia: supplementary source to test when Wikidata/local mappings lack useful coverage.
3. Dewey: reference for designing understandable broad headings. Reusing its protected schedules would require suitable permission; reference use is not an agreement to copy the full classification.

The source list is approved for planning. Coverage checks, permissions, efficient access, conflict handling, and integration tests remain developer tasks. Failure of an external source should not stop ordinary YouTube search or reopening already saved topics.

## Video classification implemented — 2026-10-15

The founder approved flat topic labels, provisional topics, and one primary Universe per video with expandable related-Universe labels. Backend Gemini extraction now retrieves Wikidata concept candidates and selected named relationships, then uses Gemini to resolve meaning and assign the primary/related Universes. This is a bounded lookup, not a full graph import or nested user interface. Existing saved-topic grouping and identifiers are preserved. See [implementation, prompts and evidence](../../backend/classification/README.md). One live Gemini check exercised provisional fallback because Wikidata reported replication lag; live concept matching and wider classification accuracy still need review. No deployment was made.
