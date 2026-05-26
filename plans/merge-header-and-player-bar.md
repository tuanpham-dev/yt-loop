# Plan: Merge Header and Player Bar

## Goal
Collapse the two bars (top header + bottom `PlayerBar`) into a single sticky bar at the top of the page that holds the wordmark, primary nav, active video title, transport controls (prev/play/next), and volume — so the bottom of the viewport is freed up for content.

## Approach

**One component, one bar.** Delete `PlayerBar.tsx` and absorb its concerns into a new top bar (replacing the inline header in `RootLayout.tsx`). The bar always renders all sections; sections that have no data (no active item) render disabled controls in a muted state so the bar's height is stable and doesn't jump as state changes.

**Layout strategy.** Single full-width sticky `<header>` with `position: sticky; top: 0; z-50`, sketch border-bottom, paper background. Inside, a `max-w-5xl` grid that wraps at narrow widths:

- **Left cluster** (always visible): wordmark (`YouTube Loop`). Clicking it routes to `/playlists`, so it doubles as the home/nav action — no separate nav pill needed.
- **Middle cluster** (active item info): truncating title + tiny progress line ("0:42 / 1:30 · loops 0:30 → 2:00"). Hidden on narrow viewports below `sm`; the wordmark already conveys context, and the controls are still reachable.
- **Right cluster** (transport + volume): prev, play, next, volume slider. Volume slider collapses below `md` to a small speaker button that pops out a tiny inline slider on hover/focus — *out of scope for this task; keep the inline slider for now, just shrink on narrow widths*.

**Why "always render" instead of conditional show/hide.** A bar that grows from "just nav" → "nav + player" when you hit Play would shift the page content down. Keeping a fixed bar height (with disabled state when idle) is more predictable and visually consistent — and it advertises the controls before there's even an active item.

**Sticky behavior.** Use `sticky` not `fixed` so the bar reserves space in the document flow. No need to add bottom padding to compensate.

**Mobile.** Two-row layout on `< sm`: row 1 = wordmark + nav + transport buttons; row 2 = title + volume. Volume is hidden if there's no active item.

**Z-index.** Bar at `z-50`. Modal stays at `z-50` too but should sit above; I'll bump the modal to `z-[60]` so click-out behaves correctly.

## Files to Change

- `src/player/PlayerBar.tsx` — **delete**. Functionality moves into the top bar.
- `src/layout/RootLayout.tsx` — replace the inline `<header>` and the bottom `<PlayerBar>` with a single new `TopBar` rendered at the top. Drop the bottom-sticky region.
- `src/layout/TopBar.tsx` — **new**. Contains wordmark (links to `/playlists`) + active-item title + transport buttons + volume slider. Takes `controls: PlaybackControls` prop. Reads active item / playlist / dispatch via existing context hooks.
- `src/ui/Modal.tsx` — bump `z-50` → `z-[60]` so it sits above the sticky bar.

That's it — 4 files (one deletion, one new, two edits).

## Steps

1. Create `src/layout/TopBar.tsx`:
   - Imports: `Link`, `useActiveItem`, `useDispatch`, `usePlaylists`, `formatTime`, `PlaybackControls`.
   - Props: `{ controls: PlaybackControls }`.
   - Render order (desktop, left → right):
     - **Brand:** `YouTube Loop` wordmark with the existing `sketch-underline` on "Loop". Wrapped in `<Link to="/playlists">` so it doubles as the home nav.
     - **Now-playing block** (`hidden sm:flex` + `flex-1`): truncating title on top, tiny `currentTime / endish · loops start → end` line beneath. When idle, shows "Nothing playing yet" muted.
     - **Transport buttons:** prev / play / next — keep the existing pill button styling from the old `PlayerBar`.
     - **Volume:** label + `<input type=range>` + numeric readout — also from the old `PlayerBar`. Volume slider hidden if no active item.
   - All wrapped in a `<header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur">` with an inner `mx-auto flex max-w-5xl items-center gap-3 px-4 py-2`.

2. Update `src/layout/RootLayout.tsx`:
   - Replace the inline `<header>…</header>` block with `<TopBar controls={controls} />`.
   - Remove the bottom `<PlayerBar controls={controls} />`.
   - Remove `import { PlayerBar }` and `import { Link, NavLink }` if no longer used directly.
   - Keep everything else (player iframe, RangeSlider, error banner, `<Outlet />`) unchanged.

3. Delete `src/player/PlayerBar.tsx`.

4. Bump modal z-index in `src/ui/Modal.tsx` from `z-50` → `z-[60]` so modals overlay the now-top-sticky bar.

5. Manual verification: dev server + screenshot at desktop and narrow width. Confirm:
   - The bar is sticky and stays put on scroll.
   - Active item title appears in the middle cluster and is truncated cleanly when long.
   - Transport + volume work; idle state shows disabled controls.
   - Modal still overlays the top bar correctly.

## Open Questions / Risks

- **Crowded middle on narrow viewports:** if the title is long, the transport buttons may wrap to a second line. The wrap is fine but watch for visual asymmetry. Mitigation: `min-w-0` + `truncate` on the title block and `flex-wrap` on the row container.
- **Sticky bar vs. video iframe layering:** the YT iframe paints below `z-40`, so no overlap. Modals already use the same z-context; the bump to `z-[60]` should resolve it.
- **No "now playing" when idle:** the middle slot shows muted "Nothing playing yet" so the bar height doesn't visibly jump when an item becomes active. Worth a quick visual check that the height matches before/after selecting an item.
