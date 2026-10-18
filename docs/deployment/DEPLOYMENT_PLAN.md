# Deployment plan

Status: planning only. No hosting resources were created and no website was published.

**Latest founder decision: deploy on Google Cloud.** Follow [GOOGLE_CLOUD_DEPLOYMENT.md](GOOGLE_CLOUD_DEPLOYMENT.md) for the current Cloud Run setup and preparation steps. The Cloudflare architecture and provider-specific steps below are retained as the earlier proposal and are superseded by that choice. The phase mapping and general release checks still apply.

## Which phase?

Deployment belongs to **Phase 16 — Put the app online, run the trial, and maintain it**, particularly tasks 16.1–16.5 in `docs/planning/DEVELOPMENT_TASKLIST.md`. Checking that the proposed hosting can run the app is still part of Phase 2. Account/data protections from Phase 14 and the relevant complete-app checks from Phase 15 are prerequisites for inviting users.

A private hosted preview can be prepared now. This does not mark all intervening phases complete or commit the project to a public launch. Optional quizzes, paid courses, full knowledge graphs and later mobile improvements are not deployment prerequisites.

## Suggested starting architecture

Use the existing Cloudflare direction, subject to a measured runtime check:

- Cloudflare Workers with static assets serves the built desktop/mobile website and `/api` under one HTTPS address.
- A Worker adapter handles hosted requests and reuses the backend's teacher, provider, validation and access logic.
- Cloudflare D1 is a candidate for shared public-video cache records and atomic usage counters. Final selection should follow a small concurrent-request check; any chosen store must enforce allowances correctly across requests and app restarts.
- Supabase continues to provide accounts, saved topics and video progress. D1 would not replace the existing user database.
- YouTube and Gemini continue to supply videos/search and teacher answers. Provider keys stay in hosting secrets.

The layout folders remain in this repository. Phone and desktop users use the same website URL; neither UI needs a separate deployment.

Start with the provider's supplied website address. Buying a domain can wait. Free allowances are budgets to check, not a guarantee that all services remain free for any usage level.

## Current blockers found in the code

1. `backend/dev.mjs` starts Vite as a local development server. It is not a production entry point.
2. `backend/server.mjs` uses a localhost Node listener and an explicit local-origin list. Hosted routing and permitted HTTPS origins need configuration.
3. `backend/provider-cache.mjs` saves to `.local-data/youtube-cache.json`; `backend/usage.mjs` saves to `.local-data/usage.json`. Neither is shared storage suitable for Workers.
4. The local limiter is synchronous and limited to one process. Hosted reservations must be atomic so simultaneous users cannot spend the same remaining allowance.
5. No hosted build/deployment configuration, health endpoint, preview access control, alert configuration or recovery procedure has been verified yet.

The current browser API client already uses relative `/api` URLs, and the player uses the current website origin. These support keeping frontend/backend on one address. Existing UI and service tests can be reused, but do not prove the hosted runtime works.

## Step-by-step work

### 1. Decide preview access and hosting

- Prepare a founder-only or small invited preview first.
- Confirm access to the founder's Cloudflare account. Prefer account login or narrowly scoped deployment credentials; never paste credentials into chat.
- Select the free plan initially and inspect its actual account settings/limits.
- Decide whether preview and later live use share the development Supabase project. For the founder preview, the existing project is an option; before real-user release, document environment separation and remove inappropriate test records without deleting unrelated data.
- Keep the current repository and folder structure.

### 2. Adapt the backend without duplicating application rules

- Extract reusable request handling from the local Node transport where necessary.
- Add the Worker entry and storage interfaces in `backend`. Retain the local Node path for development.
- Replace file cache/usage calls with injected hosted storage implementations.
- Preserve six-hour search/details caching and one-hour Trending caching, entry caps and expiry/cleanup.
- Keep cached hits working when fresh-request allowance is exhausted.
- Reserve search/chat/video-analysis attempts atomically before provider calls; count failures consistently.
- Prevent unnecessary duplicate concurrent searches using a suitable shared coordination mechanism.
- Check crypto, Supabase access, provider timeouts, video-analysis requests and response formatting in the hosted runtime.
- Configure exact frontend origins and preserve request/body validation and user access checks.
- Add a health endpoint that does not expose secrets or user data.

### 3. Prepare the deployable build and secrets

- Build the frontend using `npm run build`; serve the output in `dist` rather than the Vite development server.
- Add Cloudflare build/Worker/static asset/storage binding configuration and pin its tooling.
- Configure website routing, `/api` handling, SPA fallback and suitable browser security headers. Keep required YouTube embeds and Supabase connections working.
- Add the existing YouTube key, Gemini key/model, free-test setting, Supabase URL/publishable key and daily limit settings to protected host configuration. Public Supabase settings can still be exposed through the existing validated config endpoint; provider keys must not be bundled into browser files.
- Keep local `.env` out of uploads and version control.
- Verify provider key restrictions against the hosted runtime; do not weaken restrictions blindly or rotate projects to bypass quotas.
- Configure an access restriction for the private preview and per-user/guest throttling appropriate to the trial, alongside global provider budgets.

### 4. Configure accounts and the database

- Confirm `001_saved_topics.sql` and `002_video_progress.sql` exist in the selected Supabase project.
- Run the existing ownership SQL checks there and independently test two accounts.
- Set the HTTPS preview/live address as the appropriate Supabase Site URL and add exact allowed return URLs.
- Keep email confirmation enabled. Configure a custom email sender before inviting non-team members; the default Supabase sender is intended for limited development use.
- Verify confirmation, resend, existing-account sign-in, session refresh, sign-out, and saved topics/progress on the hosted address.
- Choose and test the account-data deletion/support procedure and explain what is retained.

### 5. Complete checks before publishing the preview

- Run the build and existing service/rule/browser suites.
- Test the hosted runtime locally, including storage expiry and limits surviving restarts/deployments.
- Send concurrent requests near the search/chat limits and verify that they cannot overspend.
- Check cached/fresh search, pagination, Trending, chat, recommendation and timestamp flows.
- Check simulated provider outages, blocked videos, slow responses and quota exhaustion.
- Confirm logging excludes credentials, email addresses and unnecessary private chat text.
- Prepare an exact deployment command/configuration and review its destination before publishing.

### 6. Publish and check the HTTPS preview

- Publish the prepared build to the selected preview destination.
- Confirm the site works when the founder's computer and local dev server are off.
- On the hosted address, test real sign-in/confirmation, search, playback, chatbot, saved topics, progress restoration and sign-out.
- Test physical Android/iPhone browsers, keyboard resizing, rotation, Shorts and return-from-chat behaviour.
- Verify the access restriction, rate limits, service usage and expiry behaviour on that destination.
- Record the real website URL and the deployed version. An uploaded frontend alone does not count as a working deployment.

### 7. Prepare the invited trial

- Provide accurate privacy/usage explanations, AI/content limitations, age rules and a support contact based on the implemented data flow. Review applicable requirements and platform policies before widening access.
- Review sample teacher answers, timestamps and related-break relevance.
- Add useful error/usage reporting, alerts and an on/off switch for expensive/failing features.
- Establish a database backup/recovery approach suitable for the selected plan and test it where available; do not assume free plans supply downloadable backups automatically.
- Document how to restore the previous app version and check database compatibility.
- Invite approximately 10 adult users first, using the planned target of up to 3 concurrent learners, and measure actual usage and performance before expansion.

## Founder actions needed when deployment work starts

- Provide access through Cloudflare login/account authorization.
- Confirm whether the first link is founder-only or for invited testers.
- Choose the Supabase project for that preview and make dashboard changes/migrations when provided.
- Set up an email sender when testing sign-up with users outside the Supabase project team.
- Supply a support address and review the trial/privacy wording before invitations.
- Decide on a custom domain later; it is optional for the first hosted preview.

## Current official references

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): Free currently includes 100,000 Worker requests/day and 10ms CPU per invocation; storage products have their own limits. Measure the adapted app against these limits.
- [Cloudflare static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/): static asset serving and Worker execution have different charging rules.
- [Workers filesystem](https://developers.cloudflare.com/workers/runtime-apis/nodejs/fs/): writable temporary files are not persistent and are unique to each request. Local JSON files cannot act as the hosted shared cache or allowance record.
- [Supabase return URL configuration](https://supabase.com/docs/guides/auth/redirect-urls): configure the site and allowed return URLs for production.
- [Supabase email sending](https://supabase.com/docs/guides/auth/auth-smtp): default delivery is restricted; use a suitable custom SMTP provider for invited users outside the project team.
- [Render free services](https://render.com/docs/free): an alternative Node host, but free web services sleep after inactivity and lose filesystem changes across restarts/deployments. It would still require durable cache/counter storage and production startup changes; it is not a drop-in solution to the current persistence problem.
