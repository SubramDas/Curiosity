# Mobile design proposal

Scope: a separate **Curiosity — Mobile** page in the existing Penpot file. Desktop designs and application code must remain unchanged during this design review.

Status: created and checked in the connected Penpot file, then approved by the founder for implementation. Open **New File 1 → Curiosity — Mobile**. The separate Desktop page was not edited. The phone UI is now implemented in `mobile-ui`; see [the implementation guide](../../../mobile-ui/README.md) for behaviour and checks. Design imagery and answers remain illustrative.

File ID: `129977ce-683b-806a-8008-c8f2a3fe903e`. Mobile page ID: `c5f19b81-2139-8092-8008-c9b178193a9b`. The connected MCP API does not expose an authoritative workspace/share link; the page name and IDs identify the actual destination without inventing a URL.

The page contains **29 boards**: the 27 numbered screen types below include three phone-width examples under item 24. There are 218 click interactions linking key navigation and learning flows. Native editable text, vector icons, and separate image fills are retained. The component library includes a mobile video-card master; the component board also contains editable button, chat-context, navigation-icon, spacing, and colour examples. These examples are not all linked component instances.

A named version, **Curiosity — mobile review ready**, was saved. Penpot file validation returned no errors. Text-bound checks across the page found no overflow beyond board edges. Twelve representative previews were inspected: Home, long video, related answer, unrelated answer, Shorts (including the corrected portrait area), 320px Home, sign in, keyboard-open chat, broad topic, break prompt, landscape, and components. Other boards were checked structurally, rather than each receiving an individual visual review. See `design-report.json` for all board IDs and verification details.

## Proposed screens

1. Home for returning learners, with Continue watching, Trending, saved subjects, videos, and a Shorts shelf.
2. First visit and guest exploration.
3. Search entry and recent searches.
4. Mixed video and Shorts results.
5. Broad subject with related searches and related-subject tags.
6. Your topics.
7. Long video playing directly above related results.
8. Continue watching from a saved position.
9. Vertical Shorts viewing.
10. Teacher conversation without a selected video.
11. Related answer with an approximate timestamp.
12. Unrelated answer with one or two suggested videos.
13. Chat with the phone keyboard open.
14. Optional related break after 12 active minutes.
15. Up to three related break candidates.
16. Sign in and create account.
17. Confirm email and resend confirmation.
18. Signed-in account and sign out.
19. Loading results.
20. Empty results.
21. Search allowance reached and connection-error guidance.
22. Unavailable player and retry.
23. Failed teacher response and retry without losing the question.
24. Home examples at 320, 360, and 430 pixels, alongside the main 390-pixel screens.
25. Landscape video view.
26. Responsive layout rules.
27. Editable component examples.

## Rules for implementation after review

- Use the available browser width, not phone brand detection. Examples cover 320–430 CSS pixels; wider phones should follow the same layout rules.
- Use one main column on phones, with 16-pixel side spacing (12 pixels on very narrow screens).
- Trending is first in the topic row. Topic chips scroll horizontally without making the whole page wider.
- Use bottom navigation for Home, Shorts, Topics, and Ask. Include the device safe area and leave space for navigation below the content.
- Maintain the official YouTube player and its controls. Long players use a 16:9 area. Keep app controls outside the embedded player.
- Shorts use the visible browser height. Include next/previous alternatives to swipe gestures and handle browser toolbar resizing.
- Open chat as a full screen on phones. Keep Send visible above the keyboard; preserve the selected video context and conversation.
- Use touch areas of at least 44 × 44 pixels, body/input text around 16 pixels, readable contrast, focus indicators, reduced motion, and browser zoom.
- Allow long titles to wrap and support loading, empty, unavailable, and signed-out states.
- Resume progress describes playback, not knowledge. Quizzes and knowledge scores remain optional future features.
- The illustrative break candidates are not a promise of content quality. Limit the break to three candidates and allow returning immediately.

## References and assets

The approved desktop design supplies Curiosity branding, Roboto typography, green accent, and reusable illustrative image assets. The mobile proposal draws on YouTube’s familiar video feed and Shorts navigation patterns; it does not reproduce YouTube branding.

- [Official YouTube app listing and mobile screenshots](https://play.google.com/store/apps/details?id=com.google.android.youtube)
- [Official Shorts browsing guidance](https://support.google.com/youtube/answer/10059070?hl=en)

Thumbnails, creators, questions, answers, and timestamps in the design are illustrative. No YouTube or Gemini API requests are needed to create the mockups.

`create-mobile.js` is the Penpot-native generation source. It intentionally refuses to run if the mobile page already exists: inspect partial execution before continuing, and never recreate or overwrite existing work blindly.

After initial generation, native edits corrected the Shorts player to a 9:16 region, added the swipe hint, changed Back targets to the relevant context, and marked bottom-navigation shapes as fixed with bottom constraints. The saved Penpot version is the final review source; the initial generator does not include those refinements. Prototype clicks illustrate navigation; text entry, video playback, swiping, keyboard resizing, and data loading are not simulated by the static boards.
