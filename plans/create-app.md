# Plan: YouTube Loop App

## Goal
Build a React + TypeScript + Tailwind SPA where users create playlists of YouTube video segments (with start/end/volume) and replay them on continuous loop, with all state persisted to `localStorage` and the active player surviving navigation between views.

## Approach

**Scaffolding:** Vite (`react-ts` template) + Tailwind CSS v3 (stable, well-documented PostCSS plugin pipeline) + React Router v6 + `@dnd-kit` for drag-and-drop reordering.

**State management:** A single `PlaylistsContext` backed by `useReducer`, persisted to `localStorage` via a small `usePersistedReducer` hook (writes on every state change, reads once on init). One source of truth for playlists, items, the active playlist id, the active item index, and player settings (playing/paused).

**Player persistence:** The YouTube IFrame Player is mounted once inside a `RootLayout` shell that wraps all routes via React Router's `<Outlet />`. The player iframe is anchored in the layout — only the route content above/below it re-renders on navigation, so playback never tears down.

**YouTube integration:** Use the official YouTube IFrame Player API loaded via a small `loadYouTubeApi()` singleton promise. Wrap it in a `YouTubePlayer` component that exposes imperative methods (`play`, `pause`, `seekTo`, `setVolume`, `cueVideoById`) and emits events the context reducer listens to (specifically `onStateChange` for natural end-of-video, plus a `requestAnimationFrame` / `setInterval` tick for the custom *end-time* trigger since the API has no native "stop at timestamp" hook).

**Auto-advance + loop:** A `usePlaybackController` hook polls the player's `getCurrentTime()` every ~250ms while playing. When `currentTime >= item.endTime` (or natural end) it dispatches `NEXT`. The reducer wraps `index + 1` modulo `items.length`, so the last item wraps to the first.

**Drag-and-drop reordering:** `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Picked over native HTML5 DnD for keyboard accessibility, touch support, and a clean sortable abstraction. The item list on `PlaylistDetailPage` is wrapped in `<DndContext>` + `<SortableContext strategy={verticalListSortingStrategy}>`. Each row uses `useSortable` and exposes a drag handle (so clicking the row body still selects the item for playback without triggering a drag). On drop, dispatches `REORDER_ITEM { playlistId, fromIndex, toIndex }`. The reducer uses `arrayMove` and **also adjusts `activeItemIndex`**: if the active item was moved, follow it to its new index; otherwise shift the index to account for items crossing it, so playback continuity is preserved.

**URL parsing:** A `parseYouTubeId(input)` util accepts a raw video ID, `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`, and `youtube.com/shorts/` URLs. Returns `null` on invalid input → drives the "invalid URL" error state in the add-video form.

**Thumbnail + title:** No API key. Use `https://img.youtube.com/vi/<id>/hqdefault.jpg` for thumbnails. For titles, use YouTube's public `oEmbed` endpoint (`https://www.youtube.com/oembed?url=...&format=json`) which requires no auth and returns `{ title, author_name, ... }`. Falls back to the video ID if the request fails (offline / removed video).

**Styling:** Tailwind utility-first. A small set of reusable component patterns (button, input, card) extracted as React components, not `@apply` classes, to keep the Tailwind layer thin.

## Files to Change

### Project root
- `package.json` — deps: `react`, `react-dom`, `react-router-dom`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; devDeps: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `tailwindcss@^3`, `postcss`, `autoprefixer`.
- `vite.config.ts` — standard React plugin config.
- `tsconfig.json`, `tsconfig.node.json` — strict mode on.
- `tailwind.config.js`, `postcss.config.js` — Tailwind v3 setup, content globs.
- `index.html` — Vite entry, app title.
- `.gitignore` — node_modules, dist, etc.
- `README.md` — install / run instructions.

### Source
- `src/main.tsx` — React root, mounts `<BrowserRouter>` and `<PlaylistsProvider>`.
- `src/index.css` — Tailwind `@tailwind base/components/utilities` directives.
- `src/App.tsx` — Defines the route tree.

### Types & utils
- `src/types.ts` — `Playlist`, `PlaylistItem`, `PlayerStatus`, reducer action union.
- `src/lib/youtube.ts` — `parseYouTubeId`, `fetchVideoTitle` (oEmbed), `getThumbnailUrl`.
- `src/lib/storage.ts` — typed `loadState` / `saveState` for `localStorage` with a schema version key for future migrations.
- `src/lib/id.ts` — short id generator for playlists/items (`crypto.randomUUID()` fallback to timestamp+random).

### State
- `src/state/playlistsReducer.ts` — reducer + action creators: `CREATE_PLAYLIST`, `RENAME_PLAYLIST`, `DELETE_PLAYLIST`, `SELECT_PLAYLIST`, `ADD_ITEM`, `UPDATE_ITEM`, `REMOVE_ITEM`, `REORDER_ITEM`, `SELECT_ITEM`, `NEXT`, `PREV`, `SET_PLAYING`, `SET_VOLUME`.
- `src/state/PlaylistsContext.tsx` — context, provider (uses `usePersistedReducer`), hooks `usePlaylists()`, `useDispatch()`, derived selectors `useActivePlaylist()`, `useActiveItem()`.
- `src/state/usePersistedReducer.ts` — small wrapper around `useReducer` that hydrates from and writes to `localStorage`.

### Player
- `src/player/YouTubePlayer.tsx` — IFrame API wrapper, `forwardRef` exposing imperative handle.
- `src/player/loadYouTubeApi.ts` — singleton script loader returning a `Promise<typeof YT>`.
- `src/player/usePlaybackController.ts` — wires the player to state (loads item, sets volume, seeks to start, watches for end-time, dispatches NEXT, handles errors).
- `src/player/PlayerBar.tsx` — the persistent UI bar: title, prev/play-pause/next buttons, volume slider, progress indicator. Mounted in the layout, **not** per-route.

### Layout & routes
- `src/layout/RootLayout.tsx` — header + `<Outlet />` content area + `<PlayerBar />` footer. The `<YouTubePlayer>` iframe lives here so it survives route changes.
- `src/routes/PlaylistsPage.tsx` — list of playlists, create / rename / delete / select.
- `src/routes/PlaylistDetailPage.tsx` — selected playlist: list of items, add-video form, per-item edit (title, start, end, volume), remove. Clicking an item selects it as the active item. List is wrapped in `<DndContext>` + `<SortableContext>` for drag-and-drop reordering.
- `src/routes/SortableItemRow.tsx` — single playlist row using `useSortable`, with an explicit drag handle (grip icon) so the rest of the row remains clickable for selection/edit.
- `src/routes/NotFoundPage.tsx` — fallback.

### Reusable UI
- `src/ui/Button.tsx`, `src/ui/Input.tsx`, `src/ui/Modal.tsx` (for rename / edit), `src/ui/EmptyState.tsx`, `src/ui/ErrorBanner.tsx`, `src/ui/Spinner.tsx`.

## Steps

1. **Scaffold:** `npm create vite@latest . -- --template react-ts`, install deps, set up Tailwind (`tailwind.config.js` with `./index.html` and `./src/**/*.{ts,tsx}` content globs, `index.css` with directives). Smoke-test with `npm run dev`.
2. **Types & storage primitives:** Implement `src/types.ts`, `src/lib/id.ts`, `src/lib/storage.ts` (with schema version), `src/lib/youtube.ts` (URL parser unit-test-able with a few example inputs, oEmbed fetch with try/catch).
3. **State layer:** Implement `playlistsReducer.ts` (all actions, pure), `usePersistedReducer.ts`, `PlaylistsContext.tsx`. Verify the reducer handles wrap-around for `NEXT`/`PREV`, no-ops on empty playlists, and `REORDER_ITEM` correctly updates `activeItemIndex` for three cases: (a) the active item itself moved, (b) a non-active item crossed over the active index, (c) movement entirely on one side of the active index.
4. **Player wrapper:** `loadYouTubeApi.ts` singleton, `YouTubePlayer.tsx` with imperative handle. Manually test with a hardcoded video ID.
5. **Playback controller:** `usePlaybackController.ts` — load video on active-item change, apply volume, seekTo(start), poll currentTime, dispatch NEXT at endTime, handle `onError` → set an error in state.
6. **Layout & routing:** `App.tsx` routes (`/`, `/playlist/:id`), `RootLayout.tsx` mounting `YouTubePlayer` + `PlayerBar` so they outlive route changes.
7. **Playlists page:** list, create form, rename modal, delete confirmation, select-to-navigate. Empty state when no playlists.
8. **Playlist detail page:** add-video form (URL or ID input, validation, loading state while fetching title), item list with thumbnails, edit modal (title / start / end / volume number inputs with validation: `0 <= start < end`), remove. Clicking an item (anywhere except the drag handle) dispatches `SELECT_ITEM` and starts playback. Wrap the list in `<DndContext>` + `<SortableContext>`; each row is a `SortableItemRow` with a grip-icon drag handle. On `onDragEnd`, dispatch `REORDER_ITEM`. Configure `PointerSensor` (with a small `activationConstraint: { distance: 5 }` so a click on the handle doesn't immediately drag) and `KeyboardSensor` (for accessibility). Empty state when no items.
9. **PlayerBar UI:** title, prev/play-pause/next, volume slider, current-time/end-time readout. Disabled state when no active item.
10. **Polish error/empty/loading states:** invalid URL message, oEmbed failure (still allow add with fallback title), playback error banner, "no playlists" / "no items" empties.
11. **Manual verification:** Run `npm run dev`, create playlists, add videos via different URL formats, set start/end/volume, verify auto-advance, last→first wrap, reload-persistence, navigation-during-playback, and drag-reorder (including reordering the currently-playing item — playback should not interrupt, and the new order should be honored by the next auto-advance).
12. **README:** install + run instructions, brief feature summary.

## Open Questions / Risks

- **oEmbed CORS:** The public oEmbed endpoint returns permissive CORS headers in current testing, but it's a third-party service. If it blocks the browser, fall back to letting the user type the title manually — UI will support this either way (the title field is editable).
- **Mobile autoplay:** Browsers block programmatic `play()` without a user gesture. First playback should always be user-initiated (clicking an item or pressing Play); subsequent `NEXT` calls within the same gesture chain generally work. Worth verifying on iOS Safari.
- **`endTime` precision:** Polling every 250ms means up to ~250ms of overshoot past `endTime`. Acceptable for this UX. Tightening the interval would burn CPU; can revisit if it feels sloppy.
- **`localStorage` quota:** Trivial for this dataset (text + IDs only — thumbnails are URLs, not blobs). Not a concern.
- **YouTube embed restrictions:** Some videos disable embedding. The IFrame API surfaces error code 101/150. The error banner handles this and offers "skip to next" via the existing NEXT action.
- **Schema migrations:** Persisted state includes a `version` field so future shape changes can migrate or reset safely.
- **Strict mode double-mount in dev:** The player loader and persisted reducer must be idempotent under React 18 strict-mode double-invocation. The loader singleton handles this; the reducer's localStorage write is naturally idempotent.
- **Drag handle vs. row click:** The row body needs to stay clickable for "select & play" while the grip icon is the only drag affordance. `@dnd-kit`'s separate `attributes` / `listeners` props (applied only to the handle) handle this cleanly, plus a `distance: 5` pointer activation constraint as a safety net against accidental drags from clicks.
- **Reorder during playback:** The `REORDER_ITEM` reducer logic must keep `activeItemIndex` pointing at the *same item* (not the same position) so the iframe doesn't reload and playback continues seamlessly.
