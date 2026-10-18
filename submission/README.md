# Revelink — SSRD submission pack

- **Editable PowerPoint:** `Revelink_AI_Builder_Cup_SSRD.pptx`
- **PDF for submission:** `Revelink_AI_Builder_Cup_SSRD.pdf`
- **Team:** SSRD. **Team leader:** Subram Das.
- Original `Submission Template _ AI Builder Cup.pptx` is preserved.
- All substantive template prompts are answered in order; the download-instruction slide and blank closing slides are omitted. One additional slide explains meaningful Gemini use.
- Speaker notes contain the pitch, implementation evidence, assumptions and limitations. Diagrams/text remain editable; UI captures are images.

## Finish before uploading

1. Add the public demo-video URL on slide 14. Keep the recording **under three minutes**. The founder said they will supply this later. The verified public GitHub URL is already filled in.
2. Update both PowerPoint and PDF after changing links. The easiest regeneration path is to edit `deck-details.json`, then run `build_deck.py` and export the result to PDF.
3. The public site still uses **Curiosity** and an earlier implementation. The deck accurately identifies the newer **Revelink** features as local. If deploying the newer build separately, repeat the hosted journey and update the status wording/screenshots.
4. A fresh browser run found a missing **Other saved searches** path in the legacy Universe navigation test. The deck reports **63/64**, not an entirely passing suite. Code was not modified for this presentation task.

The [official requirements](https://aibuildercup.com/themes.html) ask for a PDF deck. The [FAQ](https://aibuildercup.com/Faqs.html) also asks for a public source repository, working deployed link and a demo under three minutes. Reviewed 18 October 2026. This pack has not been uploaded to the event portal.

## Evidence and scope

| Check | Result | Meaning |
|---|---|---|
| `npm test` | 95 passed: 10 experiment + 85 current checks | Service/rule behavior with controlled dependencies |
| `npm run build` | Passed | Type checks and production browser bundle; size advisory remains |
| `npm run test:browser` | 63 passed, 1 failed | Simulated APIs, player and accounts; one legacy saved-search navigation failure |
| Public demo | HTTP 200; Home and GPU results rendered | Current hosted site reachable during this session |
| Live teacher | HTTP 200 in 2,529 ms; two YouTube recommendations | One general question, with no current-video context; not a latency benchmark |
| Public GitHub | Unauthenticated GitHub API returned 200; `private: false` | Repository publicly accessible during this session |
| Historical provider check | 18 YouTube results in 867 ms; one note-based answer in 955 ms | Recorded 13 October in `PHASE_2_RESULTS.md`; not contemporary load testing |

Logs are under `evidence/`. Public live question: “Why are GPUs useful for AI? Explain simply.” This call used the existing allowance without changing quotas. No deployment, database mutation, Git publication or account creation was performed.

The final test failure is `tests/browser/universes.spec.ts:228`; it waits for the absent `Other saved searches` control. The available error snapshot confirms that the current sidebar offers the three named Universes. This presentation task does not resolve the product regression.

No claims of user traction, improved learning outcomes, reviewed-content accuracy, mastery, production load capacity or profitability are made. The cost slide is a transparent **reference compute calculation**, not an all-in estimate or actual Mumbai bill. Labour and variable AI/supporting-service charges are excluded.

## Codebase understanding behind the deck

- `src`: React startup and coordination of account identity, navigation, video selection, searches, teacher context and graph entry.
- `shared`: reusable account, chat, search, video, topic, classification, playback, active-learning and graph behavior.
- `desktop-ui` / `mobile-ui`: separate responsive presentation. The latest desktop search guardrail screens do not imply full mobile feature parity.
- `backend/chat`: validated questions, structured Gemini answers, source-basis labels, eligibility checks for public video input, timestamp validation, fallbacks and actual YouTube recommendations.
- `backend/search`: educational intent, clarification, metadata-purpose checks, incremental jobs, cached decisions and a separate bounded related-break route.
- `backend/classification`: two-stage Gemini topic classification, Wikidata candidate lookup, primary/related Universe policy and provisional fallbacks.
- `backend/gemini`: a shared process-local priority queue and provider cooldown behavior. Multiple replicas need coordinated scheduling.
- `backend/providers`, `backend/storage`, `backend/http`: replaceable external adapters; cached metadata and persistent atomic budgets; static serving and throttling. Production uses Cloud Run and Firestore, with Secret Manager configuration.
- `backend/supabase.mjs` / `supabase`: auth and user-owned topics/playback through server-checked credentials and database ownership rules.
- `backend/graph`, `content/graph`, `scripts/graph`: prepared graph implementation; defaults off. Draft catalog: 30 concepts / 26 connections. Migration, reviewed publication, video content and real account checks remain.
- `experiments`: developer live checks and legacy fixtures, separate from production code.
- `tests`: service/rule checks and browser journeys; passing simulation is not live provider or real-account verification.
- `design`: Penpot is the approved design source. Connected Penpot boards and the approved Orbit Book brand were inspected; no Figma edits were made.

The architectural decisions were cross-checked against `ARCHITECTURE.md`, current implementation, the latest project decisions, feature READMEs, deployment records and freshly executed checks. Older documentation contains historical states; the deck uses current code for local capabilities and the actual hosted page for deployment claims.

## Regeneration

Python requirements: `python-pptx`, `Pillow`, `CairoSVG`; `PyMuPDF` for rendered validation. LibreOffice exports the PDF. Dependencies were installed in a temporary virtual environment, without changing application dependencies.

```bash
/tmp/revelink-ppt-venv/bin/python submission/build_deck.py
libreoffice -env:UserInstallation=file:///tmp/revelink-lo-profile --headless \
  --convert-to pdf --outdir submission submission/Revelink_AI_Builder_Cup_SSRD.pptx
```

Review after regeneration, especially after adding longer names or URLs. The reference compute rate source is [Cloud Run pricing](https://cloud.google.com/run/pricing); variable model rates are on [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). Rates and eligibility must be matched to the actual region, model and billing tier before projecting total cost.

## Artifact review

The exported PDF has 14 pages matching the 14 PowerPoint slides. All slides have speaker notes. Rendered slides were visually inspected, and identified text overlaps and dark-slide hyperlink contrast were corrected. Shape/page bounds checks found no outside-page elements. Product and repository links survive the PDF export. The only remaining placeholder is the founder-supplied demo-video URL. See `evidence/artifact-validation.json` and `assets/contact-sheet.png`.
