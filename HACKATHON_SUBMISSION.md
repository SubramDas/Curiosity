# AI Builder Cup 2026 submission

Official requirements checked on 2026-10-14. The founder reports that a Google Cloud budget is set; its amount, enforcement type and coverage have not been independently checked. The public demo is deployed at https://curiosity-u2ubbw6fra-el.a.run.app.

## Dates

- Prototype deadline: October 18, 2026.
- Evaluation: October 19–November 6.
- Finalists announced: November 7.
- Finale: December 4 in Singapore.

[Official timeline](https://aibuildercup.com/).

The public pages reviewed do not state a separate mandatory number of days for keeping the demo online, or an exact submission cutoff time/timezone. Check the participant dashboard for those details. The founder selected December 31, 2026 as the availability target. The service has no automatic expiry; billing, credentials and quotas must remain available. This is a founder decision, not a quoted event rule.

## Submission materials

The official FAQ lists a working deployed link, a public GitHub repository, a demo video shorter than three minutes, and a detailed solution deck. It also requires a project built within the event timeline and a team of 2–4 eligible participants. The rules specify Google Cloud as the main platform.

[Official FAQ](https://aibuildercup.com/Faqs.html).

Prepare these materials alongside deployment. The source repository must exclude credentials and private data before becoming public; no repository publication or push has been performed as part of this planning task.

The requirements page calls for Google AI models/platforms and deployment via Cloud Run or Firebase. It requests the proposal deck as PDF and English submission materials. Curiosity's content discovery and tutoring appear to fit **Media, Content & Digital Experiences**, which includes education. The founder confirmed **Media, Content & Digital Experiences** as the registered theme. Some category labels on the requirements page differ from the six theme headings; use the actual dashboard selection and seek organizer clarification if needed.

[Official themes and requirements](https://aibuildercup.com/themes.html).

## Deployment implications for Curiosity

Submission framing: Curiosity helps learners discover useful videos, understand them with a Gemini teacher, and return to organised topics and saved playback. Explain the benefit through an end-to-end demonstration and measured behaviour. Describe engagement and convenience as design goals; do not claim improved learning outcomes without evidence.

- Cloud Run is deployed in project `aibuildercup-511419`; use the live link above and the recorded configuration in GOOGLE_CLOUD_DEPLOYMENT.md.
- Keep the guest demonstration usable without requiring judges to create an account or have Google Cloud IAM access.
- Protect provider calls with shared atomic budgets and request limits while preserving useful cached results.
- Keep Gemini teaching, relevance labels, actual video suggestions and timestamp navigation visible in the demonstration.
- Record the real hosted link and explain which Google services are used, with an accurate architecture diagram.
- Existing Supabase accounts/storage are supporting services. The FAQ does not expressly resolve whether this particular hybrid setup qualifies; do not claim organizer-approved eligibility. Confirm any platform restriction in the participant dashboard or with the organizer before submission.
- Recheck the full journey and provider usage during evaluation; budget alerts do not guarantee that requests will remain available or that spending stops.

## Suggested video flow

Use a short GPU learning journey: search, choose a video, ask a related doubt, follow a timestamp, ask a different-topic question, see a real video suggestion, and return to a saved topic/progress. Briefly explain the problem and intended audience. Show observed behaviour and label limitations accurately; do not present viewing activity as verified understanding.
