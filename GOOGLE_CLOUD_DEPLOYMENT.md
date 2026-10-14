# Google Cloud deployment

## Live demo

**https://curiosity-u2ubbw6fra-el.a.run.app**

Deployed on October 14, 2026. The founder wants this address available through **December 31, 2026**. The service has no automatic expiry or scheduled shutdown. Keeping it available requires active billing, provider credentials, Supabase and sufficient quotas; this date is an operating target, not an uptime guarantee.

- Cloud project: `aibuildercup-511419`.
- Service: `curiosity`, region: `asia-south1` (Mumbai).
- Verified ready revision: `curiosity-00004-28h`, receiving all traffic.
- [Open the service in Google Cloud Console](https://console.cloud.google.com/run/detail/asia-south1/curiosity/metrics?project=aibuildercup-511419).
- [Health endpoint](https://curiosity-u2ubbw6fra-el.a.run.app/api/health).
- [Demo information](https://curiosity-u2ubbw6fra-el.a.run.app/demo-info.html).

This completes the initial hosting work from Phase 16, including production feasibility work from Phase 2. It does not complete every release or hackathon submission task.

## What runs where

| Part | Deployed setup |
|---|---|
| Desktop and phone website, backend | One public Cloud Run service; built React files and `/api` share an address |
| Runtime | Node 24 container, listening on Cloud Run's supplied port |
| Build and image storage | Cloud Build and Artifact Registry |
| YouTube and Gemini credentials | Secret Manager; values never shipped in the browser bundle |
| Public-video cache and daily counters | Firestore Standard, Native mode, `(default)` database in Mumbai |
| Accounts, saved topics and playback progress | Existing Supabase project |
| Service identities | Separate `curiosity-runtime` and `curiosity-build` accounts |

The runtime identity has database access and access to the four app secrets. The build identity has the Cloud Run builder role. Browser Firestore reads and writes are denied; backend access uses IAM. The Supabase publishable key is intentionally public, while privileged Supabase keys are rejected.

Both layouts keep their separate folders and reuse shared learning features. Local development still uses Vite and local storage; hosted operation uses persistent shared storage.

## Limits and costs

- Minimum instances: zero; maximum: one. A cold start can delay the first request.
- One CPU, 512 MiB memory, concurrency ten, request timeout 120 seconds.
- Daily provider reservations use Firestore transactions, persist across revisions and reset by UTC date. Cache hits do not consume these reservations. Failed provider attempts can consume allowance.
- Per-minute request checks run inside each server process: 180 total POST API requests, 60 per IP, ten search requests per IP and six chat requests per IP. These checks supplement the shared daily counters; they are not a distributed identity or abuse-prevention system.
- Cache: search and video details six hours; Trending one hour; at most 400 indexed records. Identical pending requests share a lookup. TTL cleanup is asynchronous; expired content is not served as fresh content.
- The founder reports creating a budget. Its amount, alert delivery and coverage have not been independently verified. Budget alerts alone do not stop spending. Scaling and request limits reduce exposure but do not guarantee zero charges.
- Builds, image storage, secrets, database operations and other services can incur separate charges. Monitor the Cloud Run metrics, logs and project billing during judging.

## Account configuration

The founder confirmed on October 14 that Supabase Site URL and Redirect URLs include the exact live demo address, while local return URLs remain.

Keep email confirmation enabled. Before inviting users who are not on the Supabase project team, configure and verify the email sender/custom SMTP as required by the project. The guest demo does not require an account. Real hosted confirmation-email delivery, two-account isolation and playback restoration still require founder checks; automated account tests use simulated services.

## Releasing another version

Use Node 22 or newer locally; the deployment container uses Node 24.

```bash
npm ci
npm test
npm run build
npm run test:browser
gcloud config set project aibuildercup-511419
node deployment/google-cloud.mjs deploy
```

The deploy helper uses the existing CLI login, selected local non-secret settings and ignored secret-version metadata in `.local-data/cloud-secret-versions.json`. It uploads an allowlisted source copy excluding credentials, `.env`, local saved data and tests. It builds the container, updates the hosted origin and records the address in `deployment/deployment-report.json`.

`node deployment/google-cloud.mjs setup` is the initial provisioning helper. Do not rerun it routinely: it creates new secret versions from local configuration. For key rotation, review the secret/version change before redeploying. On another development machine, recreate the version metadata from the deployed secret configuration without copying secret values into source control.

A revision is an individual release of the same service. Releasing another version preserves the website address and shared database. Use Cloud Run's Revisions tab to route traffic to a known working revision if a release fails. Do not delete the database or secrets as part of a rollback.

## Verification completed

- Production build and 41 service/rule checks passed, including asynchronous quota reservations, cache coordination, persistence simulations and production HTTP handling.
- Thirty automated desktop/mobile browser journeys passed using simulated providers.
- Cloud Build built the real container; the hosted revision reports Ready and receives all traffic. Local container execution was unavailable because the installed Podman wrapper could not write its runtime directory.
- Live website, public account configuration, health endpoint and demo-information page returned HTTP 200. Website responses include the configured security headers.
- Three concurrent live GPU searches returned ten videos each. A repeated search after redeployment returned ten videos without increasing the Firestore provider counter.
- Live generic teacher request returned an answer and two real video suggestions.
- Hosted desktop (1440 pixels) and mobile (390 pixels) search screens showed ten video cards without horizontal overflow. Screenshots were inspected. A real YouTube iframe opened with no app player alert; this does not verify sustained playback on a physical phone. One browser-console 404 message had no matching failed application response and remains unattributed.
- Firestore cache TTL policy is confirmed ACTIVE.
- Firestore's rules API compiled and passed ten deny-access cases covering authenticated and unauthenticated reads/writes; those rules were deployed. These are prototype rules and should be reviewed before broader use.

Real-device playback, account emails, saved progress across devices, a complete twelve-minute learning session, sustained load and teaching accuracy remain wider trial checks. No public GitHub push, submission video or deck has been created by this deployment.

## Official references

- [Cloud Run source deployments](https://docs.cloud.google.com/run/docs/deploying-source-code)
- [Container requirements](https://docs.cloud.google.com/run/docs/container-contract)
- [Secrets with Cloud Run](https://docs.cloud.google.com/run/docs/configuring/services/secrets)
- [Firestore transactions](https://docs.cloud.google.com/firestore/native/docs/manage-data/transactions)
- [Cloud Run pricing](https://cloud.google.com/run/pricing)
- [Budget alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets)
- [Supabase return URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase email configuration](https://supabase.com/docs/guides/auth/auth-smtp)
