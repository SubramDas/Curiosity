# Startup idea: curiosity-driven learning platform

Created: 2026-10-11  
Status: founder concept; customer demand, commercial rights, and economics unvalidated.  
Working name: undecided.


## Latest agreed direction — 2026-10-12

This section overrides older suggestions below where they differ. Earlier notes are kept as conversation history.

- Audience: students and early-career professionals in India, English, initially aged 18+ as accepted from the starting suggestions.
- First version: free website, YouTube video source, search any topic, scroll available matching video results, watch a chosen video, ask chat doubts, and return to saved broad topics and smaller topics/videos.
- Computing remains the first area with prepared checked content; it must not restrict the search box to computing alone. Wider YouTube results and checked teaching material are distinct.
- DEC-04 and task 0.4: learner tests and scored learning goals are optional later.
- DEC-06: after about 10–15 minutes, maximum two or three related entertaining videos. Proposed implementation counts active learning, offers a skip, and avoids idle/background time.
- DEC-07: tile editing/hiding is optional later. Automatic grouping and avoiding duplicate tiles are required now.
- Other starting decision suggestions are accepted, with the explicit audience and wider search changes above.
- Tasks 0.6–0.9 will be reviewed later. Surveys/interviews run alongside development and do not block it.
- The assistant acts as developer and chooses free starting tools. See DEVELOPMENT_TASKLIST.md and PHASE_2_TECHNICAL_PLAN.md for current implementation details.
- Phase 2 now includes a local React/TypeScript prototype with observed live search, chat, and video playback. Guest topic grouping and timer rules have checks. Supabase save/reopen, owner isolation, reviewed content, account limits, and hosting/release checks remain unfinished. See README.md and PHASE_2_RESULTS.md for the current build and evidence.

## 1. Founder vision

A tutor and discovery app combining Netflix-style personalization, YouTube-style search and video discovery, short entertaining content, and conversational clarification. Learners can explore a topic without repeatedly moving between YouTube, Google, and ChatGPT or losing focus to social media.

Potential audiences named by the founder: children, students, and professionals. The initial audience has not been selected.

## 2. Pain point and motivating example

The founder wanted to understand GPUs. They watched an introductory YouTube video, searched for Nvidia and AMD GPUs and rankings on Google, and asked ChatGPT follow-up questions. Moving between these tools increased friction and created opportunities to open Instagram and abandon learning.

Problems to investigate:

- Finding trustworthy explanations appropriate to existing knowledge.
- Deciding what to learn next and resolving doubts in context.
- Maintaining interest without drifting into unrelated scrolling.
- Keeping temporary learning interests from dominating the main recommendation feed.

This is one founder experience, not yet evidence of widespread demand or willingness to pay.

## 3. Proposed experience

1. Enter a natural-language query such as “I want to know about GPUs.”
2. Receive only three or four suitable introductory videos, initially shorts or roughly three to four minutes long.
3. Receive related recommendations: Nvidia, AMD, GPU comparisons, rankings, and other interesting developments.
4. Adjust depth to the learner. Professionals may receive longer explanations, including videos longer than six minutes, relevant blogs, papers, and course material.
5. Ask follow-up questions and search for additional material within a topic tile. The exact conversational tutor behavior remains to be defined.
6. After several learning videos, optionally encounter entertaining material related to interests, such as gaming connected to GPUs. The founder envisages trending shorts or reels that also introduce adjacent knowledge.
7. Return to a main discovery section or continue a saved learning topic without having one topic overwhelm the whole feed.

The preference for video and audio is a product hypothesis; faster or better learning than text has not been established here.

## 4. Feed and topic organization

- A main section for trending, engaging shorts.
- Broad topic tiles containing narrower subtopics.
- Related searches should be grouped so that random searches do not produce an unmanageable number of tiles.
- Users should control the subjects they explore and the influence those subjects have on recommendations.
- Exact rules for grouping, merging, archiving, deleting, and limiting tiles are undecided.

## 5. Knowledge graph and progress

Example concept connections:

```text
Computing
  GPUs
    Nvidia
      RTX
        Ray tracing
        DLSS
    AMD
    GPU comparisons
  CPUs
```

The founder imagines a graph covering internet knowledge, with relevant topic neighborhoods kept focused; GPU exploration should not accidentally become an unrelated finance or medical feed. Whether unrelated domains are globally excluded or simply separated by context needs clarification.

Proposed progress display: a small visual graph showing how much the learner knows about a topic.

Implementation questions: define concepts, prerequisites, related interests, content mappings, and evidence of understanding. Watching a video can establish exposure; it cannot by itself establish mastery. A graph of the entire internet is a long-term ambition rather than an initial implementation requirement.

## 6. Content and integrations

Proposed sources: YouTube videos and shorts, Instagram reels, websites and papers discovered through search, and selected material from Coursera and Udemy. Audio is also envisioned; its source and playback model are undecided.

The founder proposes negotiating a monthly or annual arrangement with course providers to offer selected lessons relevant to each user's interests.

Commercial and technical access remain unverified. Linking, embedding, hosting, extracting audio, and redistributing individual lessons are different arrangements. A consumer or team subscription should not be assumed to grant redistribution rights.

Initial source checks on 2026-10-11:

- [YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies): constrain downloading audiovisual content, altering player functionality, and certain monetization practices. Any integration needs review against the proposed experience.
- [Udemy Business course collection](https://business-support.udemy.com/hc/en-us/articles/115005368447-List-of-courses-included-in-Udemy-Business): its curated collection differs from the full consumer marketplace. This source does not establish permission to resell individual lessons inside another app.

No Coursera or Instagram integration terms or partnership agreement have been verified in this discussion.

## 7. Proposed revenue

- Start free with approximately two broad topic tiles.
- Charge for exploring additional topics or accessing more tiles.
- Explore subscriptions involving paid course content and provider agreements.

Unresolved: who pays, what paid value they receive, pricing, licensing costs, inference/search costs, and gross margin. Restricting topic exploration may discourage the curiosity the product seeks to encourage; this should be tested rather than assumed.

## 8. Preliminary investor assessment

The pain point is plausible: a learner must assemble explanations, sources, and next steps across tools. The opportunity is a guided learning journey with contextual clarification and measurable understanding.

The current scope combines discovery, tutoring, entertainment, content aggregation, progress assessment, and course licensing. This makes the first product and customer unclear. The founder's personal experience is a starting point, not investment evidence.

Potential tensions:

- Entertaining interludes may sustain interest or reproduce the distraction the app promises to solve.
- Children, university students, and professionals have different needs, buyers, content expectations, and product requirements.
- Duration and popularity do not establish teaching quality, credibility, or prerequisite fit.
- A concept graph can organize information but does not itself demonstrate learning or create a defensible business.
- Technical scalability depends on content access, indexing, recommendation quality, freshness, and variable costs; business scalability also requires acquisition, retention, and willingness to pay.

Current judgment: worth testing with a narrow audience and topic area; insufficient evidence for an investment decision.

## 9. Suggested first experiment — adviser proposal, not founder commitment

Start with one audience and one domain. One candidate is adult beginners exploring computing topics such as GPUs.

Manually curate a small set of credible resources. Provide three introductory options, a short path of next concepts, source-linked clarification, and a simple check of understanding. Give users control over whether adjacent entertaining material appears.

Recruit roughly 10–15 people who recently tried to learn a comparable topic. Observe their existing process before showing the prototype. Test whether they complete a self-chosen learning goal, demonstrate understanding, return voluntarily, and express willingness to pay. Define success thresholds before testing; this sample provides directional evidence rather than market proof.

Compare versions with and without entertaining interludes. Measure goal completion and distraction as well as engagement. Decide whether the first product needs entertainment based on the result.

## 10. Investor questions and adjacent answers

Founder answers are recorded below. Unresolved details are explicit. Adviser proposals elsewhere in this document are not founder decisions.

### Q1. Who is the first customer?

Choose one initial audience. What age range, country, language, and learning context will you serve? Who uses the product and who pays?

**Founder answer:** Initial audience undecided. The founder originally intended to serve children, students, and professionals and requests guidance on selecting a first segment.

### Q2. What outcome does the user want?

In the GPU example, is the goal to satisfy curiosity, choose a GPU to buy, pass an exam, or develop a job skill? What should the learner be able to explain or do after a session?

**Founder answer:** Satisfying curiosity while understanding the underlying concepts.

### Q3. How frequent and costly is this pain?

Apart from your own experience, who has described this problem? How often do they face it, what do they do today, and what learning do they abandon?

**Founder answer:** No customer count or prevalence estimate yet. The founder requests a method to quantify the problem and describes unrelated exciting shorts interrupting study and leading to prolonged scrolling.

### Q4. Why would users switch?

What specific result would make someone choose this app over YouTube plus ChatGPT? What remains valuable if those tools improve topic recommendations and explanations?

**Founder answer:** Convenience: everything in one app, personalized recommendations, and a clean interface. The founder compares this proposed switch with adoption of ChatGPT for tasks previously done through Google. This is a hypothesis, not evidence that users will switch.

### Q5. What is the role of entertainment?

Should entertaining interludes be automatic, optional, or in a separate section? If they increase time spent but reduce learning, which outcome should the product prioritize?

**Founder answer:** Two or three videos related to the current topic, presented in a more creative, engaging, comedic, or absurd way than conventional educational content. Placement, optionality, and the priority when engagement conflicts with learning remain undecided.

### Q6. How will the app establish understanding?

Would users accept a brief question, explanation in their own words, or practical task? What evidence should distinguish “watched” from “understood” on the graph?

**Founder answer:** Questionnaires at specific points are a possible approach. The assessment design has not been developed; guidance requested.

### Q7. What can launch without partnerships?

Would links and permitted embeds be enough initially? Is integrated playback of paid course lessons essential to the first experience?

**Founder answer:** Yes. The MVP will use YouTube only and is intended to be free initially. Paid-course partnerships are deferred.

### Q8. How will recommendations earn trust?

How should the app choose between a popular clip and a clearer, more accurate explanation? How will it handle outdated GPU rankings, contradictory sources, and different learner levels?

**Founder answer:** Proposed selection based on YouTube views, likes, and dislikes, aiming to show the best content. Adviser correction: public dislike counts are unavailable through the official API; popularity alone does not establish learning quality.

### Q9. How should tiles work?

If someone searches GPUs, investing, and cooking, who chooses the broad categories? Can users rename, merge, archive, or remove tiles and reset recommendation influence?

**Founder answer:** Tile customization is not planned initially, but the founder wants to discuss this further. Grouping and recommendation controls are still undecided.

### Q10. Why would someone pay?

Is the paid benefit additional topic tiles, better guidance, tutoring, progress assessment, or premium content? What price would the intended payer realistically consider?

**Founder answer:** Potential future paid benefits: premium lessons, more topics, and progress assessment. Pricing and willingness to pay remain untested.

### Q11. How will the first users find it?

Where can you recruit the first 100 relevant users? What reason will they have to return after their first curiosity is satisfied?

**Founder answer:** The founder expects the convenience of learning in one app to attract and retain users. A recruitment channel and evidence of repeat use have not yet been identified.

### Q12. What resources and evidence will guide the first build?

Are you building alone or with a team? What time, budget, and skills are available? What result from a small pilot would make you continue, narrow the idea, or change direction?

**Founder answer:** The founder needs guidance on technical skills, time, budget, and team. Current skills, available hours, cash budget, and collaborators have not yet been specified.

## 11. Conversation and decision log

### 2026-10-11 — Initial discussion

- Founder supplied the eight-part concept and GPU learning example recorded above.
- Founder requested an investor-style assessment, relevant questions, and a Markdown record updated as the conversation develops.
- Adviser identified a plausible pain point and unresolved audience, learning, content-access, and revenue assumptions.
- Twelve discovery questions recorded; founder answers pending.
- No audience, pricing, partnership, product name, or MVP scope has been agreed.

Future updates should place each founder answer immediately below its question, preserve meaningful changes of direction in this log, and distinguish confirmed decisions from hypotheses.


### 2026-10-11 — Founder follow-up

- Confirmed intended learning outcome: curiosity plus conceptual understanding.
- Confirmed intended MVP: YouTube only, free initially.
- Clarified entertainment: two or three topic-related creative/comedic videos rather than unrelated content.
- Recorded answers beside all twelve investor questions.
- Initial audience, validation, assessment, ranking, tile behavior, and delivery resources still require decisions.

## 12. Guidance after founder follow-up — proposals awaiting agreement

### Audience selection

Choose a first segment by observable behavior and ability to recruit it, rather than assuming age determines learning preferences. Compare adult university students exploring computing out of curiosity, early-career professionals exploring computing, and school-age learners. Interview adults in the first two groups before committing. School-age users introduce different purchasing and product requirements.

Suggested initial hypothesis: adults aged approximately 18–25 who already use YouTube to explore computing concepts outside required coursework. Geography and language remain open. This fits the founder's GPU example and permits a narrow content library; demand and payment potential remain unknown.

Evaluate each candidate on problem frequency, concrete unmet needs, access to interviewees, observed repeat use, and eventual payer. A segment is a launch focus, not a permanent limit on the vision.

### Quantifying the problem

1. Interview 15–20 relevant people. Ask about their last actual learning attempt before describing the product: topic, goal, tools, switches, unanswered questions, distraction, completion, and frequency in the past month.
2. Report counts with denominators and recruitment source. A convenience sample can reveal patterns; it cannot estimate prevalence among all students or adults.
3. Have 10–15 participants keep a one-week learning diary, recording learning attempts, interruptions, tool switches, and whether they reached their own goal. Avoid collecting unrelated browsing history.
4. Test a curated journey against their usual workflow on comparable topics. Counterbalance the order where practical. Track concept understanding, goal completion, navigation effort, and voluntary return after one week.
5. Use a larger survey with a clearly defined sampling frame if a population prevalence estimate is needed. Describe sample bias and uncertainty. Do not multiply a small convenience-sample percentage by the entire student population.

Suggested small-pilot decision rule, chosen in advance rather than claimed as an industry benchmark: continue to a larger experiment if at least 6 of 10 testers reach the predefined concept goal and at least 4 voluntarily return within a week. Inspect individual feedback and understanding relative to usual workflow; these small counts do not establish product-market fit.

### Entertainment and assessment

Treat related entertaining videos as a testable feature. Start with one optional creative explanation after a short learning sequence; compare this with no interlude, then test the founder's proposed two or three clips. Measure whether users return to the concept path and understand the material. Relatedness alone does not guarantee learning value.

Offer a short optional baseline question and one or two application questions after a concept cluster. Example: explain why a GPU suits many similar computations; distinguish ray tracing from DLSS in a scenario. Provide feedback and a retry. Keep questions brief and reviewed for correctness.

Use progress labels such as unexplored, explored, and checked with a date. Avoid a precise “percentage known” from watch time or a few quiz answers. A later revisit can test retention.

### YouTube content and initial architecture

Use official YouTube discovery APIs and the standard embedded player for suitable, embeddable videos; provide a fallback when a video is unavailable. Review the exact implementation against YouTube policies. The app should add a learning path, concept organization, and understanding checks beyond a browsing feed.

Start with roughly 5–10 computing concepts and a manually reviewed library of roughly 30–50 videos. Filter by relevance, beginner level, accuracy, freshness, language, duration, and playability. Views and likes can be supporting popularity signals; they should not determine whether an explanation is correct or suitable. Keep learning-fit judgments distinct from the original YouTube metrics.

Official references checked on 2026-10-11:

- [YouTube video resource statistics](https://developers.google.com/youtube/v3/docs/videos): public dislike counts are private; owner-authorized access is different from access to arbitrary third-party videos.
- [YouTube developer policy guide](https://developers.google.com/youtube/terms/developer-policies-guide): an experience resembling YouTube must add sufficient independent value and respect playback requirements.

A first prototype can contain topic input, three curated starting videos, a small concept path, related creative content, and brief understanding checks. Arbitrary-topic search and a universal knowledge graph can follow evidence that the narrow experience is useful. Contextual doubt resolution remains an important scope question: YouTube-only content does not itself provide grounded conversational answers.

For tiles, automatically group searches into a small set of broad categories. Adviser recommendation: at least allow removal of an unwanted topic and correction of grouping, since control over clutter is part of the original promise. This has not been accepted by the founder.

### Delivery resources

Begin with interviews and a manual clickable or lightweight web prototype before hiring a full team. No custom recommendation model or graph database is necessary for that experiment. A later web MVP needs frontend development, backend/API integration, lightweight data storage, content review, analytics, and product testing. One capable full-stack developer can cover much of the implementation; the founder can own recruitment and curation.

Planning estimates, not quotes: allow roughly two weeks for discovery and a manual pilot; a narrowly defined software MVP might take a further four to eight weeks with an experienced developer. Actual duration and cash requirements depend on available hours, existing skills, tutoring scope, and whether help is hired. Do not commit a budget before these are known.

### Next discussion questions

1. Which potential learners can you personally recruit for 15 interviews in the next two weeks?
   **Founder answer:** The founder asks for websites to recruit students for validation; access to an existing student network remains unspecified.
2. What is your coding experience, available time per week, maximum initial budget (and currency), and access to collaborators?
   **Founder answer:** Available time: 20 hours/week. Initial budget: ₹1,00,000. One collaborator. The founder mentions coding experience, but level, stack, and collaborator skills/hours remain unspecified.
3. Which geography and language do you want to test first?
   **Founder answer:** India; English.
4. Must the first prototype answer doubts conversationally, or can it route a doubt to the next curated explanation?
   **Founder answer:** Both conversational answers and a relevant video when available.


### 2026-10-11 — Recruitment and resources follow-up

- Founder specifies India and English for the initial market.
- Available time: 20 hours/week; budget: ₹1,00,000; one collaborator. Coding proficiency and collaborator availability remain unknown.
- Founder wants both chat clarification and related videos when available. YouTube is the MVP video source; the chat model and reliable grounding sources still require selection.
- Added a separate recruitment and validation plan in STUDENT_VALIDATION.md.
- Recommended first recruitment segment remains a proposal: Indian college students aged 18+ who recently explored a computing topic on YouTube out of curiosity.

### Proposed resource allocation — not a quote or spending authorization

| Purpose | Budget envelope |
|---|---:|
| Interviews and pilot incentives | ₹10,000 |
| Hosting, model/API usage, domain, and basic tools | ₹15,000 |
| Targeted development/design help if needed | ₹25,000 |
| Reserve until validation clarifies requirements | ₹50,000 |
| Total | ₹1,00,000 |

These are planning caps, not verified supplier prices. Founder and collaborator labor are excluded. Start with discovery and a manual pilot before committing development expenditure. An 8–12 week planning window at 20 founder hours/week provides 160–240 founder hours, not a guaranteed delivery date.

For chat: use reviewed concept notes or other permitted material as grounding, link relevant sources, and acknowledge when the available material cannot answer a question. Do not assume arbitrary YouTube transcripts can be retrieved or reused. Video recommendations should come from the curated library initially. Premium lessons and payment remain outside the confirmed free MVP.

## 13. Second-round founder questions

Added: 2026-10-11. These questions extend the initial discussion; earlier answers remain recorded above. Answers are pending and proposals are not commitments.

### Q13. What should a successful first session achieve?

For a beginner searching GPUs, what should they understand after 15 minutes, and what would convince them the app helped?

**Founder answer:** Pending.

### Q14. How should learning depth be chosen?

Should users choose beginner/intermediate/advanced, state a goal, or answer one baseline question? How will someone correct a wrong level recommendation?

**Founder answer:** Pending.

### Q15. What happens after the introductory videos?

Does the learner follow a suggested sequence, choose among related concepts, or ask chat what to explore next? Who controls the direction?

**Founder answer:** Pending.

### Q16. When does a learning session end?

Should the app indicate that the original question has been answered and offer a stopping point? How should that coexist with an engaging discovery feed?

**Founder answer:** Pending.

### Q17. What should chat know and cite?

Should answers use the current video's permitted supporting material, a reviewed topic library, or broader sources? What happens when the available evidence is missing or contradictory?

**Founder answer:** Pending.

### Q18. What happens when there is no suitable video?

Should the app offer a longer explanation, explain through chat, or explicitly say it lacks coverage? Which trade-off is acceptable?

**Founder answer:** Pending.

### Q19. How much personalization is necessary on day one?

Which explicit signals should guide recommendations: goal, selected level, completed concepts, saved topics, or preferences? Can users correct or reset those signals?

**Founder answer:** Pending.

### Q20. What limits define the first content domain?

Would you accept a computing-only first release, and which five topics should it handle especially well? How should searches outside that scope be handled?

**Founder answer:** Pending.

### Q21. Why will learners return after satisfying one curiosity?

Is the repeat-use trigger a saved journey, a new question, a practical goal, or exploration of a related concept? What evidence would distinguish voluntary repeat use from notification-driven visits?

**Founder answer:** Pending.

### Q22. What becomes harder to copy as the product improves?

Will the advantage come from reviewed concept paths, evidence about explanations that work for particular learners, creator relationships, distribution, or something else? What would remain distinctive if a competitor copied the interface?

**Founder answer:** Pending.

### Q23. What are you willing to pay to serve a free user?

What monthly operating-cost ceiling fits the budget? If chat becomes heavily used, would you limit usage, narrow scope, or introduce payment? Actual unit costs must be measured.

**Founder answer:** Pending.

### Q24. What evidence would change your mind?

Before building further, what interview or pilot result would make you change the audience, remove entertainment, reconsider chat, or stop investing in this approach?

**Founder answer:** Pending.

### Q25. How will the two collaborators work together?

Who owns product decisions, interviews, curation, implementation, and maintenance? What availability and ownership expectations have been agreed?

**Founder answer:** Pending.

### Q26. Which delivery format fits the first learning context?

Are users likely to learn on phones or laptops? Is a mobile-friendly website sufficient to test the experience before a native app?

**Founder answer:** Pending.

### Q27. What does premium mean in a YouTube-based product?

Are users eventually paying for guidance and assessment, original lessons, or separately licensed content? What additional value would justify payment when the underlying videos are freely available?

**Founder answer:** Pending.

### 2026-10-11 — Additional discovery questions

- Founder requested further questions about the startup idea.
- Added Q13–Q27 covering session outcomes, navigation, stopping points, chat grounding, coverage gaps, personalization, initial scope, repeat use, defensibility, operating costs, decision criteria, collaboration, delivery format, and paid value.

### 2026-10-11 — Student survey draft

- Founder deferred the second-round startup questions and requested a survey for SurveySwap.
- Created STUDENT_SURVEY.md with copy-ready questions, response types, eligibility routing, neutral concept wording, and analysis notes.
- Survey targets adult college/university students in India with a recent YouTube learning experience; curiosity-driven responses can be analyzed separately.
- No form has been published. Completion time must be checked on the finished form.


### 2026-10-12 — End-to-end developer task list

- Founder requested a detailed, phased task list for developers covering the complete app.
- Created DEVELOPMENT_TASKLIST.md with confirmed scope, proposed defaults, decisions, requirements traceability, numbered implementation tasks, dependencies, acceptance gates, data/API contracts, release operations, and future expansion.
- The plan preserves the free YouTube MVP with grounded chat; paid lessons, external providers, wider audiences, and native apps are separately scoped later phases.
- Audience, stack, computing-only scope, account behavior, tile controls, and entertainment settings remain decisions rather than silently confirmed requirements.
- Revised planning envelope for the fuller private MVP and pilot: roughly 240–385 combined person-hours, subject to developer estimates and scope decisions. This is not a delivery commitment or vendor quote.


### 2026-10-12 — Task list rewritten in simple language

- Founder requested language that a person without a technical background can understand.
- Rewrote DEVELOPMENT_TASKLIST.md with everyday wording, explained necessary terms, full responsibility names, and clear instructions for when each phase is complete.
- Explained every DEC label, including the number and placement of entertaining videos in DEC-06.
- Preserved all 19 phases, 219 numbered tasks, first-version decisions, checks, budget, and later-feature plans.


### 2026-10-12 — Founder scope choices and free-first Phase 2

- Recorded the founder's decisions on optional learner tests/tile editing, timed entertaining breaks, wider video search, saved broad topics, and the student/early-career audience.
- Accepted other starting suggestions and deferred tasks 0.6–0.9; validation now runs in parallel.
- Updated affected development tasks rather than just appending a conflicting new feature list.
- Created PHASE_2_TECHNICAL_PLAN.md with developer answers, researched free starting options, API allowances, data-handling considerations, and the unfinished working-test checklist.

### 2026-10-13 — Broad categories and topic relationships discussion

- Founder proposes a finite set of broad topic graphs/tiles with smaller topics and videos inside; related later searches should reuse existing broad tiles.
- Founder asks whether all topics can be grouped this way and whether a complete existing graph can be reused.
- Recorded discussion in TOPIC_RELATIONSHIPS.md: finite app headings are possible, but subject boundaries overlap and an exhaustive universal graph is not established.
- Developer proposes a shared topic collection with named relationships, multiple category memberships, one primary placement per saved query, and separate subject views.
- Wikidata, DBpedia, and Dewey were researched as different kinds of starting material. Category list and graph architecture remain proposals.
- Current optional-test decision remains: show explored activity rather than claims about verified knowledge or a percentage of universal knowledge.


### 2026-10-13 — Single-tile placement and knowledge sources agreed

- Founder decides each saved smaller topic should appear in only one main tile, with small tags beside its heading indicating other related subjects.
- Founder asks to include existing knowledge sources in the system plan. Wikidata is the first source to evaluate/integrate, DBpedia supplements useful gaps, and Dewey informs broad headings subject to reuse permissions.
- Updated DEVELOPMENT_TASKLIST.md, TOPIC_RELATIONSHIPS.md, and PHASE_2_TECHNICAL_PLAN.md with storage rules, navigation, source tasks, and tests.
- Suggested at most two visible tags plus an overflow option, reasons for placement, and brief tag explanations. These interface details are proposals.
- Topic editing and learner tests remain optional later. No external graph has been integrated yet.

### 2026-10-13 — Seamless video viewing and saved playback requested

- Founder requests a scrolling reel experience for short videos, with longer videos playing directly above the chosen search result.
- Save playback position so returning users can continue watching. Guest progress stays in the browser; signed-in progress belongs to the account.
- The first implementation groups videos of up to three minutes as short videos; this does not establish that YouTube classifies them as official Shorts.

### 2026-10-13 — Desktop layout proposal for review

- Founder requests a professional, simple desktop layout closely following YouTube: search and account controls in the header, video/short thumbnails with titles, and saved broad topics in the left sidebar.
- Main feed should mix trending educational content and recommendations related to previous searches.
- Founder requests a Figma design first, with implementation only after review.
- Design review is documented in `design/review/DESIGN_REVIEW.md`; existing app code is unchanged during this design task.

### 2026-10-14 — Approved desktop design and searched-topic navigation

- **Founder:** Replace the top bar's All / For you options with Trending, then topics the user has searched. The rest of the Figma design is approved for implementation.
- **Decision:** Keep one tab per saved broad subject and the smaller searches inside the sidebar subject. New users initially see only Trending. Related subject tags still point to other subjects without duplicating the saved search.
- **Implemented:** Header search/account controls, broad topics in the left panel, YouTube thumbnail cards and Shorts, chat beside topic results, automatic playback saving, and Continue watching. The mobile version uses a sidebar drawer.
- **Home feed:** Show recent popular learning content plus suggestions from at most two saved searches. Popularity is a discovery signal, not a content-quality or knowledge score. New Trending clicks do not automatically create searched-topic tabs.
- **Optional:** Manual watch-later saving, quizzes, and a knowledge graph remain later work. See `design/review/DESIGN_REVIEW.md` for the approved design and implementation details.


### Design tool change — Penpot

- **Founder:** Move the entire existing design to Penpot and use Penpot for future design work because Figma MCP has a call limit.
- **Decision:** Penpot is the primary design tool. Preserve the previous Figma design as an archive; retain Home, GPU topic, Shorts, and the approved Trending-first tab bar.
- **Transfer status (2026-10-14):** Completed in Penpot's **New File 1 → Curiosity — Desktop**. Home, GPU topic, and Shorts were rebuilt as native editable layers, with four reusable components. Screen previews were inspected, file validation passed, and a named version was saved. See `design/penpot/README.md` for references and reconstruction limitations.

### Chatbot direction — teacher and video guide (2026-10-14)

- **Founder request:** Chat should accept questions across topics and recommend a relevant video even when the question is unrelated to the video currently playing. It should act as a teacher explaining doubts and pointing to further explanations.
- **Founder request:** When the current video covers the question, provide a clickable timestamp that opens the relevant part.
- **Current implementation:** The chat endpoint is limited to a checked CUDA note. The displayed related-video suggestion is selected by a CUDA title match; it is not a question-specific recommendation or verified timestamp. These requests require a chatbot redesign.
- **Technical finding:** YouTube's official embedded-player API supports seeking to a time. The Data API does not provide unrestricted transcript download for arbitrary public videos; captions download requires permission to edit the video. See [player API](https://developers.google.com/youtube/iframe_api_reference) and [caption permissions](https://developers.google.com/youtube/v3/docs/captions/download).
- **Candidate to test:** Gemini's documented public YouTube URL input can support questions about video content and timestamp references. This is a separate AI capability, not a feature of our existing YouTube Data API client. Compatibility, accuracy, model usage, and account limits have not been tested for this project. See [Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding).
- **Suggested flow, pending founder discussion:** Resolve the question using conversation context, explain it, and offer 1–3 actual relevant videos from cached/provider search. Use current-video context when relevant; support other topics without forcing a video switch. Keep answer sources separate from videos suggested only by metadata. Timestamp links require video-content evidence and must not be inferred from titles. If a matching segment cannot be established, offer a whole-video suggestion without a guessed time.
- **Suggested improvements, not yet approved for implementation:** Follow-up conversation, adjustable explanation depth, question-specific video relevance, reasons for each suggestion, explicit source links, optional save of a new topic, and user-requested understanding checks. Formal quizzes remain optional.
- **Implementation order proposed:** Broad-topic conversation and relevant-video recommendations; then a small video-analysis/timestamp experiment; then expand timestamps only after accuracy and allowance checks. No chatbot code was changed during this discussion.

### Teacher chat approved and implemented — 2026-10-14

- **Founder:** Proceed with the teacher flow. Explicitly explain when a question is unrelated to the video, then answer and offer 1–2 relevant videos; provide a timestamp when the question relates to a matching video section.
- **Implementation:** General teaching and follow-ups, relevance labels, up to two real question-specific YouTube results, public-video analysis, and AI-matched timestamp buttons are implemented. Questions need not remain within the current topic or require a selected video. Uncertain/title-only relevance is labeled honestly, and no timestamp is shown without media analysis and a valid supported range.
- **Extra controls:** Simpler/example/deeper follow-ups, Explain this part, and New conversation. History remains in memory across navigation and clears on refresh or account changes. Suggestions do not automatically switch playback or create topic tiles.
- **Evidence and limits:** See CHATBOT_PLAN.md for automated checks, the live examples, analysis limits, and remaining accuracy review. General replies do not have live web fact-checking. A live AI timestamp is not proof of precise accuracy. Formal learner tests and durable chat saving remain later work.

## Latest decision: Universe organisation — 2026-10-14

The founder chose **Universe** as the name for the main learning groups: **Science & Technology**, **Commerce & Business**, and **Arts & Humanities**. Trending stays the default. Each Universe opens directly into a video feed with subject labels and filters. Search works across all three without requiring a category choice.

Classified videos show **Universe – subtopic** above the video. A video has one primary Universe, with related-Universe tags for overlap. If classification is unclear, the result still appears without an assigned label. Existing saved searches and playback progress must be preserved during a future migration. The knowledge graph will be discussed later; watching alone does not establish understanding.

The next step is founder review of desktop and mobile Penpot designs. Application implementation is awaiting that review. See design/penpot/universes/README.md. This decision supersedes the earlier broad-category navigation proposal for the next design iteration.

### Desktop Universe review clarification

For desktop long-video cards/player, show the Universe – subtopic label between the video title and creator name. Keep the reviewed Shorts design. A normal click on a previously watched video should continue at its saved position, without requiring a separate app Resume video button. Use a subtle progress bar to identify partially watched videos. These decisions are captured in Penpot; app implementation awaits design approval.

### Desktop Universe implementation status

The founder approved starting desktop implementation. The Universe feeds and the desktop label/resume refinement are implemented locally, using provisional English-title classification and preserved legacy topic keys. Mobile Universe implementation and the knowledge graph remain later work. No redeployment was made as part of this change.

### Gemini and Wikidata video classification — 2026-10-15

- Founder agreed on flat topic labels, provisional topics when no Wikidata match exists, and one primary Universe per video with expandable +1/+2 labels for substantial direct connections. The video's explanatory focus determines placement: cooking chemistry belongs to Science & Technology, while cooking technique can belong to Arts & Humanities.
- Implemented locally: Gemini metadata topic extraction → bounded Wikidata candidate/relationship retrieval → Gemini concept resolution and primary/related Universe assignment. Uses only the existing environment-configured model. The UI classifies in the background, and Universe feeds use primary-only placement. Legacy saved-search grouping and stored identifiers are preserved.
- Build, 57 service/rule checks and 36 simulated browser journeys pass. A live GPU example returned a provisional Science & Technology classification while Wikidata reported replication lag. Wider accuracy and a successful live graph match remain to review. No public redeployment was made. See `backend/classification/README.md` and `PHASE_2_RESULTS.md`.

### Sequential Gemini scheduling approved — 2026-10-15

After a provider limit error, the founder approved sequential Gemini requests with pacing, teacher priority, visible-video classification, reuse of the extracted topic on retry, and pausing on provider limits. These changes are implemented locally with one shared backend queue, asynchronous classification jobs and waiting/finding labels. Default request-start spacing is 15 seconds; exact account allowances remain unknown and the interval is configurable. No model switch, quota reset, live model call or public redeployment was made for this update. Build, 68 service/rule checks and 38 distinct browser journeys are covered by passing checks. See `backend/gemini/README.md` and `PHASE_2_RESULTS.md`.
