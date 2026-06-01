# Plan: Move Controls into Duration Slider Container

## Goal
Relocate prev/play/next and volume controls from the TopBar into the RangeSlider container, forming a classic media-player control bar directly below the video.

## Approach
Add a controls row inside the existing RangeSlider card in `RootLayout.tsx`. Strip the buttons and volume from `TopBar.tsx`, leaving the TopBar as a lean logo + title/time-info strip. No new files needed — the RangeSlider component stays a pure slider; the controls row is added in the `RootLayout` at the callsite.

**Target layout:**
```
[  Video  ]
┌─────────────────────────────────────────────────────────┐
│  [0:05]  ──────────●──────────────────────  [1:23]      │  ← RangeSlider (unchanged)
│  < | ▶ Play | >   0:35/1:23   Vol ──── 80   [⧉ PiP]   │  ← new controls row
└─────────────────────────────────────────────────────────┘
```

The TopBar becomes: `Logo  |  Title / loop-range info`  (no buttons, no volume, no PiP).

## Files to Change
- `src/layout/RootLayout.tsx` — add a controls row inside the `mt-4` slider div; pass `controls`, `isPlaying`, `activeItem`, `dispatch`, `activePlaylistId` to it; move the Document PiP button from its video overlay position into this row; remove props that are no longer needed in TopBar call
- `src/layout/TopBar.tsx` — remove prev/play/next buttons and volume slider; keep logo + title/time info display; remove the `controls` prop (only needs `currentTime`, `duration`, `endLabel` from it — either keep the prop or narrow it to `{ currentTime, duration }`)

## Steps
1. **TopBar** — remove the `ml-auto` button group (prev, play/pause, next, volume); keep the logo and the title/time `sm:flex` info block; the `controls` prop now only needs `currentTime` and `duration`, so narrow `PlaybackControls` usage to what remains.
2. **RootLayout** — inside the `mt-4` slider div, after `<RangeSlider …/>` add a horizontal controls row that mirrors the TopBar button styles:
   - prev `<` button
   - play/pause button (accent-colored)
   - next `>` button
   - current-time / end-label text (moved from TopBar's inline info, or kept as-is in both)
   - `Vol` label + range input + numeric value (previously md-only in TopBar; show here always, or from `sm` up)
   - `⧉ PiP` button (desktop-only, `supportsDocPip && !isPip && !isDocPipOpen`; previously overlaid top-right on the video)
3. Remove the Document PiP overlay button from the video container (it moves to the controls row).
4. Verify disabled states work correctly (no active item → buttons disabled).
5. Test that scroll-PiP controls (inside the `isPip` branch) are unaffected.

## Open Questions / Risks
- The title + time info in TopBar currently shows on `sm` screens. After the move, the time info will also appear in the controls row — decide whether to keep the TopBar info as-is (redundant but harmless) or remove it to avoid duplication. Recommend removing the `currentTime / endLabel` line from TopBar and keeping only the title.
- Volume is currently `md`-only hidden in TopBar. In the new player bar it can be always visible (the card has more horizontal room).
