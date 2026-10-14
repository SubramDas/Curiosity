# Mobile UI

Implemented from the approved mobile design. Phone layout and placement live here; accounts, search, chat, topic rules, playback and progress are reused from `shared`.

Design source: **New File 1 → Curiosity — Mobile** in Penpot. See [the mobile design handoff](../design/penpot/mobile/README.md).

## Layout and behaviour

- `MobileLayout`: page shell, visible viewport sizing, and player positioning on landscape rotation.
- `MobileHeader`: compact brand/menu/search/account header and expanded search form.
- `MobileNavigation`: Home, Shorts, Topics and Ask, with room for the device safe area.
- `MobileTopics`: broad subject cards using the shared topic rules and related tags.
- `MobileSearchSuggestions`: recent saved searches and a path to the teacher.
- `MobileLearningLayout`: full-screen chat alongside a preserved, hidden video feed. Hidden playback pauses; returning keeps the selected clip. Timestamp buttons return to the player.
- `MobileMenu`: Continue watching and the existing 30-second developer timer demo.
- `useMobileViewport`: follows the visible browser area when the keyboard opens. Extra teacher controls and bottom navigation hide while typing so the composer stays visible.
- `styles.css`: scoped mobile presentation, fluid cards, horizontal topic/Shorts shelves, account screen, landscape playback and touch targets.

`src/App.tsx` selects this layout at up to 600 CSS pixels wide, or up to 900 pixels wide with a height of 500 pixels or less for phone landscape. It uses available screen size, not phone brand detection. Desktop layout/components are retained. Mobile CSS is scoped to the mobile shell.

The app uses real provider results and existing account actions, not the illustrative Penpot titles/answers. Search and media are not duplicated across layouts. Breaks remain optional and contain at most three unreviewed candidates. Saved playback remains separate from proof of understanding.

## Open on a phone

1. Connect your computer and phone to the same Wi-Fi.
2. Stop an existing `npm run dev` process with Ctrl+C.
3. From the repository root, run `npm run dev:lan`.
4. Open the printed **Phone on the same Wi-Fi** URL in your phone browser. Use `http`, not `https`.

The phone accesses Vite on port 5173. Vite forwards `/api` to the backend, which stays bound to localhost. Only the detected private IPv4 frontend addresses are added to the API origin list for this mode. The regular `npm run dev` remains local-only. This is local testing, not a hosted deployment. If the phone cannot connect, check that it uses the same Wi-Fi (not guest Wi-Fi/mobile data) and that the computer firewall allows port 5173 on the private network.

Email confirmation links may need the phone URL added to Supabase Authentication's allowed redirect URLs for a new-account test. Existing email/password sign-in does not require a new redirect URL.

## Verification results

TypeScript/production build and all 35 service/rule checks pass. Thirty simulated browser journeys pass, including nine mobile journeys covering 320/360/390/430-pixel widths, topics/search, teacher/video context, timestamp return, keyboard resizing, Shorts navigation, account access, saved playback, landscape, optional breaks and search-limit recovery. A focused landscape check also verifies that the player fits above the bottom navigation after rotation.

Home, teacher, Shorts, keyboard and landscape screenshots were inspected. Browser checks use Chrome with simulated provider accounts, videos and API responses. The keyboard check simulates VisualViewport resizing; it is not proof of behaviour on every physical phone. Real iOS Safari, Android keyboard, autoplay and live account-progress checks remain useful device checks before a wider release. No additional live provider requests were needed for this UI work.
