# Teacher chat: agreed behaviour and current implementation

Updated 2026-10-14. The founder approved broader teaching, question-specific videos, and matching sections. They also requested an explicit message when a question is unrelated to the current video.

## User flow

1. Ask about any topic, with or without a video selected.
2. Read a short relevance label: related, unrelated, uncertain, or no video selected. Title-only comparisons are described as tentative. Replies identify the video that was selected when the question was asked, so changing the player does not make an older reply misleading.
3. Receive an explanation. General AI knowledge, supplied reference notes, and video-based explanations are labeled separately. General answers do not pretend to be checked against live websites.
4. For a supported, related video section, use **Watch at …** to jump inside the official player. The suggested section includes a short reason and paraphrased supporting detail; it is AI matched, not independently verified. Clicking an older timestamp can reopen its original video.
5. When there is no matching section, see up to two actual videos returned by YouTube for the resolved question. Results are checked for public/embeddable status, but their educational quality is not reviewed. Suggestions do not change playback until clicked, and asking about another subject does not automatically create a saved-topic tile.
6. Follow up, ask for a simpler explanation/example/deeper detail, or start a new conversation.

## How it works

- The browser sends the question, current video ID, approximate playback position, and up to six recent conversation messages. Server input checks restrict size and reject arbitrary video URLs.
- Gemini generates the explanation, relevance decision, recommendation search phrase, and optional video section. Any media input URL is constructed from the checked video ID. Only public videos with known duration up to 30 minutes are analyzed.
- Timestamp buttons require actual video input in the model request, related relevance, non-empty supporting detail, and a valid range within the video's duration. The server supplies the video ID; model-generated IDs/links are not accepted. If these checks fail, the answer can still appear without a timestamp.
- Recommendations use the existing search/details cache. The server returns at most two public, embeddable results, excluding the video already being watched. Video search or allowance failures do not discard an otherwise successful explanation.
- The source list uses developer-supplied reference URLs, not generated links. The original CUDA note remains available when relevant.
- Chat history stays in browser memory during navigation. It is not persisted in Supabase or the metadata cache. Refresh, New conversation, sign-out, or an account switch clears it. Late responses after clearing/sign-out are ignored.

## Limits and fallback

Defaults: 25 general/model requests and eight video-analysis attempts per UTC day. A video-analysis request also counts toward the general allowance. `CHAT_VIDEO_CONTEXT=false` disables media input. Video processing has a 60-second deadline; text requests have 20 seconds.

If the model rejects a video request with HTTP 400, the app attempts one text-only fallback and reserves a second chat request. Network failures are surfaced without automatic retries. Missing/private/unlisted/long videos or an exhausted video budget cannot receive timestamps. Unknown/current facts must be described with uncertainty; web search grounding is not enabled. If no relevant section is found, the app offers a whole-video suggestion where available.

These are prototype guardrails, not proof of the project's free billing tier or total production capacity. Learner quizzes, scored understanding, durable chat history, and automatic topic saving remain optional/later work.

## Evidence

- 35 rule/service checks pass, including timestamp permissions/ranges, input limits, source IDs, unrelated-query routing, recommendation failure, and bounded text fallback.
- Browser regression and focused checks cover 21 journeys. Teacher checks exercise labels, follow-up history, section jumps, returning to an older reply's video, sign-out/late-response isolation, and chat before a search. Desktop and 390-pixel mobile chat screenshots were inspected; the mobile check found no horizontal overflow.
- Live configured-project example: a compound-interest explanation with two real video suggestions returned in 2.167 seconds. It was a general explanation, not a source-verified financial recommendation.
- The first GPU-video request timed out under the original 20-second deadline. Video requests were given a longer deadline. A bounded manual check then returned a related section at 00:37–00:43 in 5.620 seconds. This is an observed AI suggestion, not an independent accuracy review of the section. The model was `gemini-3.5-flash-lite`; no model or billing tier was switched.
- The live developer checks used their own recorded, capped allowance and public examples. Wide subject accuracy, timestamp accuracy across a reviewed video set, concurrent processing, and live playback at suggested points still require evaluation.

## Official capabilities used

- [Gemini public YouTube input and video understanding](https://ai.google.dev/gemini-api/docs/generate-content/video-understanding): documented public URL input; model/preview availability and provider limits can change.
- [YouTube embedded-player API](https://developers.google.com/youtube/iframe_api_reference): official seek/cue functions. The app does not download video/audio or scrape transcripts.
- [YouTube caption permissions](https://developers.google.com/youtube/v3/docs/captions/download): official caption download requires permission to edit the video; this implementation does not use it for arbitrary videos.
