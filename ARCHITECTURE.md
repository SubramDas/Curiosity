# Project structure

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
