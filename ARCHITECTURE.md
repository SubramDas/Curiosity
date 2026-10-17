# Project structure

## Revelink branding

`shared/components/Brand.tsx` supplies the approved Orbit Book symbol and Manrope wordmark to both headers. Runtime vectors, browser icons, font/license and the shared public stylesheet live in `public/brand`; index and demo-information HTML use the same assets. `scripts/render-brand-icons.mjs` renders the approved vector into app/browser sizes as a developer task. Saved-data identifiers and deployment addresses are preserved. See [assets and verification](public/brand/README.md).


## Desktop related Universe popovers

Shared classification labels consume `RelatedUniversesRendererContext`, with the renderer chosen in `src/App.tsx`. Desktop presentation and viewport positioning live in `desktop-ui/features/classification`; the native browser popover layer handles dismissal and prevents ancestor clipping. Mobile keeps the shared details fallback. The same desktop rendering applies to every shared video classification label, including history and chat. No classification/provider contract changes are required. See [behavior and verification](desktop-ui/features/classification/README.md).


## Desktop Watch history

`desktop-ui/features/history` owns the approved desktop history list and Resume/Watch again actions. Shared progress modules own date/order rules and restoration of missing video details. `useVideoProgress` stores optional progress timestamps, and the backend includes the existing account `updated_at` field in reads. No schema change is needed. `src/App.tsx` retains the mobile history flow and coordinates desktop history with the existing player. See [behavior and verification](desktop-ui/features/history/README.md).

## Desktop teacher readability

`shared/features/chat` owns safe answer formatting, suggestion cards and conversation scroll behavior. `desktop-ui/features/chat` owns the viewport-sized teacher panel and expanded layout; it resizes the existing mounted player to preserve playback. `LearningWorkspace` retains chat expansion state and supplies content through the layout callback selected in `src/App.tsx`. Provider behavior is unchanged. See [design and verification](design/penpot/chat/README.md).

## Educational search — desktop implementation

`backend/search` owns intent decisions, batched video-purpose filtering, asynchronous jobs and restricted related-break requests. It reuses the configured Gemini queue, YouTube client and persistent caches. `shared/features/search` owns reusable choice/redirect/clarification states; `desktop-ui/features/search` owns presentation. The existing video-search hook retains pagination/cancellation, and `src/App.tsx` coordinates the separate desktop Search destination. Mobile guardrail screens remain later work. See [search behavior and contracts](backend/search/README.md).

## Learning graph — implementation prepared locally

[GRAPH_IMPLEMENTATION_PLAN.md](GRAPH_IMPLEMENTATION_PLAN.md) is the feature reference. `backend/graph` now provides catalog, route, validation and publication modules, with a focused Supabase storage adapter. Shared graph modules own loading, SVG map/list, topic/event panels, local state and playback coordination; desktop/mobile folders own placement. The existing player emits separate activity samples while retaining resume-position saving.

Supabase migration 003 prepares published catalog tables, private learner records and restricted activity RPCs. A 30-topic/26-connection manifest remains unreviewed, with no videos/events. The feature defaults off until schema setup and content publication. Database access behavior and live playback have not been verified. See [activation and implementation evidence](backend/graph/README.md).

One repository contains the backend and two website layouts. Shared frontend features provide the same learning behaviour to both layouts. The app selects the mobile layout by available screen size, including phone landscape.

```text
StartupIdea/
├── backend/              # API, service calls, caching and request limits
│   ├── chat/             # Teacher input, answers and video recommendations
│   ├── providers/        # YouTube and common HTTP request helpers
│   └── content/          # Checked source-note fixture
├── desktop-ui/           # Current page layout, navigation and styles
│   ├── DesktopLayout.tsx
│   ├── components/       # Header, sidebar and topic navigation
│   └── styles/
├── mobile-ui/            # Phone layout, navigation and styles
├── shared/               # Reusable frontend features and components
│   ├── features/         # Accounts, topics, videos, chat, progress and timer
│   ├── components/       # Shared visual helpers such as icons
│   ├── lib/              # Browser API requests and display helpers
│   └── types.ts          # Shared frontend data and navigation types
├── src/                  # App entry and coordination of feature state
├── config/               # Local environment-loading configuration
├── experiments/          # Developer checks using backend services
├── supabase/             # Database migrations and access checks
├── tests/                # Service, rule and browser checks
└── design/               # Penpot designs and design handoffs
```

## What belongs where

- **Backend:** validate requests, check access, call providers, store/retrieve data, and enforce limits. Browser code reaches it through `/api`; it must never import backend modules.
- **Desktop UI:** arrange the page, header, sidebar and desktop navigation. `DesktopLayout` accepts feature content and owns placement, not account or learning rules.
- **Mobile UI:** phone-specific placement, navigation, viewport/keyboard handling and styles. It uses shared features without importing desktop layout modules.
- **Shared:** reusable feature hooks, rules, types and visual components. Keep layout-specific placement out of new shared modules. Shared modules must not depend on either UI folder or on backend files.
- **App entry:** `src/main.tsx` starts React. `src/App.tsx` coordinates existing account, topic, search, chat and navigation state, then supplies the layout with its content.

Frontend and backend can share the repository while keeping their responsibilities separate. Folders do not imply separate deployments or microservices. The hosted backend runs as one Cloud Run service and serves both layouts at the same URL. Local development still runs Vite and a separate Node API process.

## Shorts feed and saved playback

The resume row is hidden while `VideoFeed` shows Shorts, including when switching formats within a topic. Short playback progress is still saved and available in the dedicated Continue watching destination. Opening an unfinished Short there resumes its saved position. Desktop and mobile share this behavior.

## Shorts sound

Visible Shorts request playback with sound on desktop and mobile. If YouTube reports blocked autoplay, the player offers **Play with sound** for an explicit user gesture. Browsers retain control of autoplay permissions; this does not bypass their restrictions. Leaving the viewport or hiding the tab still pauses playback. A simulated mobile browser journey checks sound on the first/next Short and recovery from blocked autoplay.

## Navigation menu visibility

The desktop header hides its menu toggle when the sidebar is permanently visible (above 900px). At 900px and below it opens the collapsed sidebar. The mobile header retains its own navigation button.

## Preserved behaviour

The original CSS remains in `desktop-ui`, including base styles used by existing shared components. The app entry loads that stylesheet and the scoped mobile stylesheet; mobile modules do not import desktop modules. Mobile overrides apply only inside `.mobile-app`. The existing desktop appearance is retained.

`LearningWorkspace` accepts a presentation callback so each layout can arrange the same feed and teacher content without duplicating learning/session rules. Account UI supports the same actions in either a desktop popover or a mobile screen. Shared feature modules never import either layout. Only `src/App.tsx` chooses between them.

Public icons remain in `public`. API URLs, ports, root `.env`, database tables and browser-storage keys are unchanged. Local development uses `.local-data` caches/counters; production uses Firestore. The backend now owns the YouTube provider and HTTP helper previously located under the experiments directory; experiments import those backend modules. The legacy note-only Gemini experiment stays under `experiments`.

## Running and checking

Run all commands from the repository root:

```bash
npm run dev
npm run build
npm test
npm run test:browser
```

`npm run dev` now starts `backend/dev.mjs`. Restart an already-running development process after this move. Dependencies and scripts remain in the root `package.json`; no packages are duplicated across layouts.

## Hosted runtime

`backend/production.mjs` starts the hosted server and supplies Firestore storage implementations. Application rules depend on small storage interfaces rather than Google-specific objects. `backend/storage` owns the cache and transactional counters; `backend/http` owns static files and burst limits. Provider calls happen outside database transactions.

Cloud Run serves the built website and API together. Supabase remains responsible for accounts and user records; Firestore holds public-video metadata and global usage counts. Secrets come from Secret Manager. See [deployment details](GOOGLE_CLOUD_DEPLOYMENT.md).

## Desktop Universe presentation

`desktop-ui/features/universes` owns the desktop Universe navigation, feed loading/filter controls and metadata rendering. Shared Universe rules map legacy topic records without changing storage identifiers. Video labels and primary placement use backend Gemini/Wikidata classifications. Shared video components accept optional presentation settings, keeping their mobile defaults. The backend Universe-feed route reuses the cached suggestion loader and skips Trending. `backend/universes/search-catalog.mjs` joins server-approved search references with existing classifications in the bounded backend cache. A separate catalog read lets saved videos appear while discovery is still loading or unavailable. Desktop feeds merge by video ID and use the existing Topic filters and primary-only placement. No graph storage or migration is added.

## Video classification

`backend/classification` coordinates Gemini topic extraction, Wikidata candidate lookup, Universe policy, validation and classification reuse. `backend/providers/wikidata.mjs` owns graph API access. The same configured Gemini model is used for both classification stages, with its own persisted daily allowance. Production injects a separate Firestore cache namespace; local operation uses an ignored cache file.

`shared/features/classification` owns a background request registry and reusable labels. It sends video IDs only, deduplicates requests across components, and preserves browsing while classification runs. Desktop Universe feeds use server decisions for primary-only placement. Shared labels also appear in mobile's existing layout. Legacy keyword rules are retained solely for saved-search display mapping, not per-video labels. See `backend/classification/README.md`.


## Shared Gemini queue

`backend/gemini` owns model transport, one-request-at-a-time scheduling, teacher priority, configurable start spacing and safe rate/quota error handling. `startServer` injects the same requester into teacher and classification adapters. The current one-instance hosted runtime supports this process-local scheduler; adding replicas requires distributed scheduling. Provider counters and caches remain persistent.

`backend/classification/classification-jobs.mjs` coalesces background jobs by video ID and exposes short polling responses, keeping queued model work outside long-lived HTTP classification requests. Shared UI observers admit visible cards and remove queued offscreen work; Universe discovery uses small explicit candidate batches. First-stage extractions are cached independently so failed resolution does not repeat extraction.
