# Desktop teacher readability review

Status: approved by the founder and implemented locally for desktop. No deployment has been performed.

Open **New File 1 → curiosity-desktop-universe**, then the five boards beginning **Chat ·** below the existing Universe screens. The suggestions board is selected in the connected editor. Saved version: **Curiosity — Desktop teacher readability and video cards**.

File ID: `129977ce-683b-806a-8008-c8f2a3fe903e`. Page ID: `c5f19b81-2139-8092-8008-ca1cd36092b6`. Board/component IDs are in [design-report.json](design-report.json). The connector does not expose an authoritative workspace/share URL; no link is fabricated.

## Review screens

1. **Readable answer:** a wider teacher panel, clear question/answer separation, short paragraphs, emphasis and a timestamp action.
2. **Long answer / start visible:** headings and numbered sections begin at the top of the conversation viewport; only that area scrolls.
3. **Suggestions with thumbnails:** two compact cards with individual thumbnail images, title, creator, duration and Watch video action.
4. **Expanded chat / video companion:** wider reading area with the selected video and its position retained in a companion column; Back to video returns to the watch layout.
5. **Reading history / new answer:** earlier content stays in place and a 1 new answer control offers an explicit jump.

## Intended behavior

- Body text is Roboto 16px with 1.6 line height in the side panel, 17px/1.65 in expanded reading. Existing white/green styling, header and Universe navigation are retained.
- Side panel width is 456px, up from the older 386px design. Expanded panel is 896px wide. The illustrative 1440×1100 boards show a 620px conversation viewport and an input area below it.
- In implementation, panel height must fit the available browser viewport; keep the composer visible and let the conversation area shrink/scroll on shorter desktop windows. These are not instructions to force a 960px panel on every display.
- After a submitted question, reveal the question/start of its new answer rather than the answer's final line. If the learner is reading earlier content, keep their position and offer a new-answer control.
- Keep the composer and follow-up actions outside the scrolling transcript. Do not scroll the whole page to follow new messages.
- Preserve video context, playback position, play/pause state and conversation while expanding/collapsing chat. The expanded mock shows an illustrative paused position, not a requirement to pause automatically.
- Use existing valid video IDs/thumbnails in implementation, with an image fallback. Suggested videos open through the current player flow; timestamp actions jump within the corresponding video. Keep the current evidence/source links and AI notices; mock text is illustrative, not verified teaching material or real recommendations.

## Penpot verification

All five connected Penpot board exports were visually inspected. The answer and suggestions boards were inspected again after creating reusable native **Follow-up input** and **Suggested video card** components. Text remains editable, icons remain vectors and thumbnails are individual image fills. No whole-screen screenshot was imported. File validation returned no errors, all new descendants fit their outer boards and all pending prototype destinations were resolved.

Expand/Back, follow-up examples, timestamp/video actions and the new-answer jump link representative review states. These Penpot interactions are static prototypes; the application behavior is covered by the implementation checks below. Existing Universe boards were retained.

[create-desktop-review.js](create-desktop-review.js) is the additive Penpot generation source. It uses namespaced board keys to resume partial runs. The reusable input/card components were created afterward; inspect the recorded native boards before rerunning or making changes. Application tests were not run during the original design-only task.


## Application implementation and checks

- Shared chat renders paragraphs, headings, lists, emphasis, code and safe HTTP/HTTPS links. Raw HTML stays inert. Suggestions reuse video thumbnails, duration badges, fallback images and the existing playback flow.
- Desktop layout keeps the composer visible, sizes the transcript to the viewport and preserves reading position with an explicit new-answer jump. Expanded chat resizes the mounted player, preserving playback, draft and conversation.
- Mobile retains its existing layout and uses the shared answer formatting/cards.
- Verified with the production build, 93 service/rule/renderer/experiment checks and 54 browser journeys using simulated providers. Focused desktop checks cover answer positioning, earlier-message reading, thumbnails/fallback, playback preservation and a 720px-high viewport. No live Gemini/YouTube requests or deployment were needed.
