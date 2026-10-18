# Phase 2: setup and working checks

> This file includes historical feasibility setup. Active instructions now live in [Local setup and prototype data use](../../setup/LOCAL_SETUP.md). For the current Cloud Run architecture, guest setup, grounding and model configuration, start with [the evaluator guide](../../evaluation/EVALUATOR_GUIDE.md).

Started: 2026-10-13.

## What we are doing now

Prove that the selected services can support the main features before building the full app. The small scripts in `experiments/phase-2` call the actual YouTube and Gemini APIs when configured. They are developer experiments, not the app or a public server. The planned app remains React, TypeScript, Vite, Cloudflare, and Supabase.

The experiments use Node's built-in tools with no downloaded packages. Node 20.12 or newer is required; the current workspace has Node 20.20.2.

## What the founder needs to create now

### 1. YouTube Data API v3

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a development project for this app, or select an appropriate existing one.
3. Open APIs & Services → Library and enable **YouTube Data API v3**.
4. Open APIs & Services → Credentials and create an **API key**.
5. Restrict the key to YouTube Data API v3. This test runs from Node on the developer's computer, so a browser website restriction is not suitable. Use an IP restriction if you have a stable outgoing IP; configure the appropriate server restriction before hosting.
6. Check your project's actual quota. Keep the development project on free access; do not request paid upgrades or create projects to bypass limits.
7. Put the key in `.env` as `YOUTUBE_API_KEY`.

An API key is enough for public search/details in this test. We do not need a YouTube user login or permission to access someone's private account. Each search run makes at most two search calls and one details call. Repeated runs still consume the project's daily allowance. The current official search reference lists 100 search calls/day by default; your console is the source for your account's allowance. [YouTube search reference](https://developers.google.com/youtube/v3/docs/search/list), [video details reference](https://developers.google.com/youtube/v3/docs/videos/list).

### 2. Gemini API

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Create an API key in an eligible development project.
3. Check that the project uses the free tier with no billing upgrade enabled.
4. Choose a text model explicitly available on the free tier in your account. Put its model identifier in `GEMINI_MODEL` without a `models/` prefix. Do not guess availability from an old example.
5. Put the key in `.env` as `GEMINI_API_KEY`.
6. Read the data-use note below before enabling `ALLOW_GEMINI_FREE_TEST=true`.

The test makes one non-streaming answer request per run. It uses a small developer-prepared GPU note linked to NVIDIA's documentation; it does not extract video transcripts. Live answer quality and account limits still need checking. [Gemini content generation](https://ai.google.dev/api/generate-content), [model pricing](https://ai.google.dev/gemini-api/docs/pricing).

**Data-use note:** This is an adult developer experiment. Gemini's unpaid-service terms include using submitted content to improve products and possible human review; do not submit personal, sensitive, or confidential information. Use the supplied example questions. The current configuration is not approved for public users or children. The local flag acknowledges this experiment's conditions; it does not enforce age or guarantee arbitrary questions contain no personal data. [Gemini terms](https://ai.google.dev/gemini-api/terms).

### 3. Accounts needed next

- **Supabase Free:** Create a development project when ready. We will need its project URL and publishable key for account access and saving. I will prepare the database setup and user access rules before testing saves. No privileged database key is needed for the current scripts. [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
- **Cloudflare Free:** Create an account for the later hosted test. No Cloudflare key is needed now; we can authenticate the deployment tool locally later.

These accounts do not need to hold up the first YouTube/Gemini checks. Keep paid upgrades off. If a service asks you to activate billing for the intended test, stop that setup and tell me which service and screen you reached.

## Where to put keys

A local `.env` file has been prepared with empty settings. Open it in your editor and fill these fields:

```dotenv
YOUTUBE_API_KEY=your_youtube_key
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=your_available_free_text_model
ALLOW_GEMINI_FREE_TEST=true
```

The above values are examples, not real keys. `.gitignore` excludes `.env`, local deployment secrets, and experiment output. This prevents normal Git staging; it does not encrypt the file or prevent someone with filesystem access from reading it. Do not paste secret keys into chat, Markdown, screenshots, or browser code. The account library receives only the validated Supabase publishable/anon key and project URL from the local configuration route; this key is designed for public browser use. Tell me **“The keys are added”** when done; I can run the checks without printing them.

Node's `--env-file` normally gives existing process values precedence. The project's configuration loader now explicitly gives settings in `.env` precedence for our API keys, models, and limits, so an inherited key from another project is not silently selected. Empty local settings also override inherited ones. The loader leaves unrelated environment settings alone.

## Run the checks

No `npm install` is needed for these experiments.

```bash
# Local repeatable tests; no API calls or credentials needed.
npm test

# Reports whether settings exist, without showing their values or calling APIs.
npm run phase2:check-config

# Real search: first two available batches, with duplicates removed.
npm run phase2:search -- "I want to know about GPUs"

# Real chat: one answer from the supplied GPU notes.
npm run phase2:chat -- "How do the CPU and GPU work together in CUDA?"
```

The search box is not restricted to computing: the search command accepts other subjects too. The original note-only experiment retains its GPU fixture. Browser chat has since expanded to general teaching and supported public-video analysis; general explanations are explicitly labeled and live fact-checking is not enabled. Results are unreviewed, not recommendations endorsed as the best content. The original experiments do not save responses automatically. The browser server now caches public YouTube metadata as documented in README.md.

## What the developer will verify next

1. Run the configured YouTube check; record call counts and speed. Confirm a second page exists and that repeats appear once.
2. Inspect real titles, channels, IDs, durations, and embeddability. Missing details remain missing; the script does not invent replacements.
3. Build the browser player test using the official player. Verify successful playback and unavailable-video handling. API details alone cannot establish playback.
4. Run Gemini on the example question. Compare each claim with the linked notes and check references. Passing source-ID checks does not prove answer accuracy.
5. Prepare a roughly 20-question review set, including questions unsupported by notes. Record correctness, limitations, speed, and actual model/allowances. Compare Groq only if appropriate free access is available.
6. Add the Supabase save/reopen check with real account ownership rules. A local file or browser-only save is not proof that Supabase works.
7. Demonstrate stable single-tile grouping, related tags, and the active-learning break timer in the browser prototype.
8. Update the main task list using measured results. Keep Phase 2 open until required live checks succeed.

## Current limits

- A React browser prototype now exists. Start it with `npm run dev` after installing dependencies; see [README.md](../../../README.md). Live playback, search, and chat have been observed. Guest grouping, related tags, timer rules, and unavailable-video handling have repeatable checks.
- Supabase account/saving code and database setup files exist, but the founder reports that real account save/reopen and the database ownership check work. Graph import and deployment are not implemented.
- Browser API calls use a daily allowance stored for one local server process. Hosting still needs a shared atomic limiter. The example command-line checks have separate per-run bounds; the chat review uses the local daily record.
- There are no automatic retries or paid fallbacks. Failures show sanitized messages.
- Original chat references come from our notes. The newer teacher route also offers question-specific YouTube search results and AI-matched timestamps; these suggestions still need independent content/accuracy review. See CHATBOT_PLAN.md.
- The chat check measures full-answer time. It does not measure the planned streaming first-output target.
- Final package versions, deployment, privacy review, free account limits, and real model quality remain open.

## Check results

Live checks: **the initial network blocker is resolved; the YouTube search/details and Gemini example answer now succeed**. See [PHASE_2_RESULTS.md](PHASE_2_RESULTS.md) for measured results. Browser playback, database saving, broader chat quality, and account free-tier limits remain unverified.

Run `npm run phase2:check-config`, `npm run phase2:search`, and `npm run phase2:chat` from your own terminal with internet access. Share their outputs without including `.env` or key values. Search output contains public video details, and the supplied chat example contains no personal information. The scripts sanitize request errors and do not print keys. If search succeeds but chat fails, share the chat error code so we can fix the specific issue rather than repeat both checks.

The 20-question review set is in `experiments/phase-2/content/CHAT_REVIEW.md`. A live review ran successfully using an inherited Gemini key before the project loader was fixed. Its results evaluate the configured model and narrow note fixture, not the founder project's limits or billing. A subsequent supported example succeeded with the actual project key. Details and limitations are recorded in PHASE_2_RESULTS.md.

Local checks and progress are recorded in `docs/archive/phase-2/PHASE_2_TECHNICAL_PLAN.md`. Local simulated responses verify our handling; they do not prove provider access, live model quality, or playable videos.

## Missing confirmation emails

The app uses email and password sign-in. New accounts must confirm their address first; the confirmation email is not a passwordless sign-in link. For an unconfirmed account, the app offers **Resend confirmation email** and reports provider errors rather than assuming delivery.

1. Check the inbox and spam folder, then request one resend in the app. Avoid repeated requests when the sender reports a rate limit.
2. In Supabase, open Authentication → Logs and inspect the failed signup/resend event. Do not share passwords, tokens, full email addresses, or secret settings when reporting errors.
3. Check Authentication's email/SMTP settings. Supabase's default sender currently sends only to project-team addresses and has a small hourly limit. Other learner addresses need a configured custom SMTP sender. Do not disable email confirmation to bypass a delivery problem. See [Supabase email setup](https://supabase.com/docs/guides/auth/auth-smtp).
4. Under Authentication → URL Configuration, set the development Site URL and allowed redirects to the local app address you use (`http://127.0.0.1:5173`, and `http://localhost:5173` if used). Signup and resend request a return to the current app origin; Supabase applies its redirect allowlist.
5. After confirming, return to the app and sign in with the existing password. The public project key cannot inspect or change SMTP settings; an authorised project owner must configure them in the dashboard.
