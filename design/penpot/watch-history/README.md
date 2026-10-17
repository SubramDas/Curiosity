# Desktop Watch history review — 2026-10-18

Status: approved by the founder and implemented locally for desktop. No deployment has been performed.

Open **New File 1 → curiosity-desktop-universe**, then **Watch history · 01 · All videos / Resume actions** below the Chat boards. Saved version: **Curiosity — Watch history and Resume actions**.

File ID: `129977ce-683b-806a-8008-c8f2a3fe903e`. Page ID: `c5f19b81-2139-8092-8008-ca1cd36092b6`. The connector does not expose an authoritative workspace/share URL, so none is fabricated.

## Screens

| Board | ID | Purpose |
| --- | --- | --- |
| Watch history · 01 · All videos / Resume actions | `3f187a38-aa9d-807c-8008-ce1a176de47e` | Watched videos and Shorts, grouped by day. Unfinished rows have green Resume actions with saved times; completed rows have Watch again. |
| Watch history · 02 · Resume a video / saved position | `3f187a38-aa9d-807c-8008-ce1a1e814fec` | Opens the selected video at 02:18 with its subject, creator and teacher context. |
| Watch history · 03 · Resume a Short / clean feed | `3f187a38-aa9d-807c-8008-ce1a23249b7e` | Opens the selected Short at 00:20 without a resume shelf above the feed. |

## Behavior proposed

- Rename the sidebar destination to **Watch history**. Include both completed and unfinished videos, with the most recently watched first. Today/Yesterday headings are illustrative grouping examples.
- An unfinished video shows **Resume · 02:18**, saved time, total duration, time remaining and a progress bar. Shorts use a portrait thumbnail with a visible Short label.
- Completed videos show **Watch again**, which should restart at the beginning. This is a visual state; its prototype action is not wired in this review.
- Resume buttons and unfinished thumbnails navigate to their matching long-video/Short boards. Back to Watch history and the sidebar destination return to the history board. Static player controls illustrate resumed playback; they do not play real media.
- Preserve the existing white/green/Roboto styling. Thumbnails are separate illustrative image fills, text is editable, and controls/icons are native shapes/vectors. Existing approved boards are retained.

## Verification and implementation limits

All three exported board previews were visually inspected. Penpot validation returned no errors; all descendants fit their boards. The named version was saved in the connected file. Generation source: [create-review.js](create-review.js).

The original design-only task made no application changes or provider calls. The subsequent approved desktop implementation now includes completed/unfinished records, saved-time actions, progress and day grouping, video/Short resume and replay from zero. Account dates reuse the existing updated_at column; new local progress changes receive timestamps. Undated legacy rows appear under Earlier. Twenty entries load per page, within the existing 200-video retention cap. Mobile behavior remains unchanged. See [implementation and checks](../../../desktop-ui/features/history/README.md).
