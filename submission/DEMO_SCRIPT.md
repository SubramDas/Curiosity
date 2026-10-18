# Suggested recording — target 2:40, hard stop before 3:00

Record the actual app. This script is a proposed sequence, not evidence that every action has already been live-verified. The current hosted release is branded Curiosity; call out the name once or deploy and verify the newer release separately before recording. Avoid spending recording time on setup or sign-in. Do not present simulated browser-test responses as live AI output.

| Time | Show | Say |
|---|---|---|
| 0:00–0:18 | Opening slide; switch to app | “I wanted to understand GPUs. I found videos, searched for explanations, and asked follow-ups in separate tools. Each switch broke the flow. We are SSRD, and we built Revelink to keep that learning journey connected.” |
| 0:18–0:43 | Search GPUs and show returned videos | “Start with a curiosity. Find real YouTube videos and watch them in the same workspace. The public prototype currently carries our earlier name, Curiosity.” |
| 0:43–1:15 | Choose a public short-enough video; ask a relevant doubt | “The Gemini teacher can explain the concept and use supported video context. It labels what the answer is based on. If a relevant section is identified, the learner can jump to it.” Show an actual timestamp only if returned. |
| 1:15–1:40 | Ask “Why are GPUs useful for AI?”; open an actual suggestion | “When there is no matching section, the teacher can still explain and suggest real videos for the next question. The transition from curiosity to explanation to action stays together.” |
| 1:40–1:58 | Saved topics and resume behavior | “Return to the topic and continue from saved playback. This records activity, not a claim that someone has mastered the subject.” |
| 1:58–2:22 | Architecture slide | “Cloud Run hosts the app and Node API. Gemini powers teaching; the latest local build also adds educational-intent checks and concept classification. Firestore stores metadata caches and usage counters. Supabase supports accounts and private learning records.” |
| 2:22–2:40 | Closing slide with app/repository links | “We have a deployed prototype, 95 passing service checks, and 63 of 64 browser journeys passing. Next we will test whether learners resolve doubts with fewer context switches. Revelink: watch, discover, connect the dots.” |

If video analysis is unavailable or slow, show the clearly labelled text fallback and a real recommendation. Do not fabricate a timestamp or hide a quota error. The current queue and provider allowances may affect response time; rehearse within the existing limits. Do not reset counters or increase limits just for recording.

Suggested opening sentence for a shorter pitch: **“The hard part of learning online is often keeping the question, the explanation, and the next step together.”**
