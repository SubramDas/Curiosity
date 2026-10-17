# Revelink branding

The runtime brand is the founder-approved **Orbit Book** mark: an open book inside the discovery orbit, with a mint connection node. The name uses **Manrope 700**; the tagline is **Watch. Discover. Connect the dots.**

- `revelink-symbol.svg`: transparent vector master, copied from the approved Penpot handoff in `design/penpot/revelink/symbol-orbit-book.svg`.
- `revelink-app-icon.svg`: white symbol on a green rounded tile, matching the reviewed app-icon variant.
- PNGs: browser fallback at 32px, Apple touch icon at 180px and app-icon assets at 192/512px. `public/favicon.ico` is the legacy browser fallback.
- `revelink.css`: shared brand styling and self-hosted wordmark font for the app and public demo-information page.
- `manrope-latin-700.woff2`: Latin Manrope 700 font, retrieved from Google Fonts on 2026-10-18. The full SIL Open Font License and attribution are in `Manrope-OFL.txt`. No third-party font request is needed at runtime.

Regenerate the tile, PNGs and ICO after updating the SVG master:

```bash
node scripts/render-brand-icons.mjs
```

This uses the existing Playwright development dependency and local Chrome (or `CHROME_PATH` / Playwright Chromium). It is a developer asset task, not part of the production server.

Desktop and mobile headers use `shared/components/Brand.tsx`. Index/demo HTML load this stylesheet and icon assets directly. Browser storage keys, database namespaces and deployment URLs retain their existing identifiers to preserve saved data and connectivity; the previous Penpot concepts remain design history.

Verified with the production build, 95 service/rule/renderer/experiment checks, and 24 simulated desktop/mobile browser journeys. Additional browser checks confirmed logo/font loading, title/asset requests and viewport fit at 1440, 900, 390 and 320px. Desktop/mobile screenshots were inspected. No live providers or deployment were needed.
