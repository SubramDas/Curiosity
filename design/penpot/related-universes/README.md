# Desktop related Universe popovers — 2026-10-18

Status: approved by the founder and implemented locally for desktop. No deployment has been performed.

Open **New File 1 → curiosity-desktop-universe**, below the Watch history boards. The **Related Universes · 02 · +1 open / related Universe** board is selected. Saved version: **Curiosity — Related Universe popovers**.

File ID: `129977ce-683b-806a-8008-c8f2a3fe903e`. Page ID: `c5f19b81-2139-8092-8008-ca1cd36092b6`. The connector does not expose an authoritative workspace/share URL; none is fabricated. Exact board IDs and validation results: [design-report.json](design-report.json).

## Review screens

1. **Collapsed count:** the primary Universe/topic stays between title and creator. A green +1/+2 disclosure pill shows additional Universe connections.
2. **+1 open:** a compact white popover beneath the count shows **Also related to**, the full related Universe name and a close button. The creator and adjacent cards retain their layout positions.
3. **+2 at the right edge:** the same popover aligns its right edge with the trigger/card to fit inside the viewport. Two connections remain separate readable rows.

The connected prototype opens the corresponding state from each count pill. Close and outside-click targets return to the collapsed state. This uses static board navigation; it does not implement live browser popover positioning or keyboard behavior.

## Intended application behavior

- The current +N represents `relatedUniverses`, not additional topic names. Use the existing names and data. Keep the primary Universe/topic visible; no new classification request is needed to open this UI.
- Popovers are informational. Opening a count or interacting inside the popover must not select/play the underlying video. Related connections do not change which primary Universe feed owns a video.
- Use click, Enter or Space to toggle; Escape and outside click close it. Return focus to the trigger when dismissed using Escape/Close. Expose an expanded state and a descriptive label such as “1 related Universe.”
- Display one popover at a time. Overlay the feed without reflow. Position below the trigger with a 10px gap; align left normally and right when needed. On shorter viewports flip above or constrain height with scrolling. Avoid clipping inside video cards, shelves or the player.
- Keep full Universe names, 14px row text, native vector icons, a 36px close target, a subtle border/shadow and the current white/green/Roboto styling. Hide the count when no related Universes exist. Long primary topic names wrap without pushing the count into the creator line.
- These feed cards illustrate the metadata treatment. Apply the same treatment to desktop video cards, history cards and the selected video metadata during implementation, keeping playback unchanged.

## Verification

All three exported previews were visually inspected. Penpot file validation returned no errors and descendants fit within their outer boards. Text is editable, icons are vectors and thumbnails are separate illustrative image fills. Existing boards and other pages were retained. [create-review.js](create-review.js) is the additive generation source.

No application tests were needed during the original design-only task. The subsequent desktop implementation was checked for stable metadata layout, keyboard focus/dismissal, viewport edges and flipping, clipped card containers, preservation of playback and mobile fallback. Production build and 95 service/rule/renderer/experiment checks pass. See [implementation and browser verification](../../../desktop-ui/features/classification/README.md).
