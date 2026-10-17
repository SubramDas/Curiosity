# Desktop related Universe popovers

Implements the approved [Penpot review](../../../design/penpot/related-universes/README.md).

- `RelatedUniversesPopover.tsx` renders the compact +N disclosure and the full related Universe names. It is informational: clicking its controls/content never selects the underlying video.
- `usePopoverPosition.ts` positions a 320px panel below the count with a 10px gap, aligns it right at the window edge, flips above when there is more room, and constrains its height with an internally scrolling list. Resize and ancestor scrolling update placement; an offscreen trigger dismisses its panel.
- The browser's native `popover="auto"` behavior provides the top layer, outside-click/Escape dismissal, a single open panel and keyboard focus navigation. Close explicitly restores focus. See [the platform behavior](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using). This implementation targets browsers supporting the Popover API.
- Shared labels accept a renderer through `RelatedUniversesRendererContext`. `src/App.tsx` supplies this desktop renderer, so it works in feeds, player metadata, Shorts, chat suggestions and Watch history. Shared modules do not import desktop modules. Mobile keeps its current details control.
- The existing classification data supplies all names/counts. Opening the popover makes no classification request and does not change primary Universe membership, playback position or saved progress.

## Verification

Production build and 95 service/rule/renderer/experiment checks pass. Focused simulated browser checks cover collapsed/open labels, unchanged title/creator geometry, no accidental playback, keyboard focus and dismissal, one open panel, right-edge placement, flipping above, resize, clipping in history cards, preserving the mounted player and switching back to mobile controls. Existing classification, desktop chat and Watch history journeys are included in the focused regression run. The rendered desktop preview was inspected against Penpot. Provider requests and the YouTube player are simulated; browser popover behavior itself runs in Chromium. No live model calls, schema changes or deployment were needed.
