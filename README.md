# YouTube Loop

Build playlists of YouTube videos and replay selected segments continuously. No account, no backend — everything is stored in your browser's `localStorage`.

## Features

- Create, rename, delete, and select playlists
- Add videos by full URL (`youtube.com/watch`, `youtu.be`, `youtube.com/embed`, `youtube.com/shorts`) or by 11-character video ID
- Each item has a title, thumbnail, start time, end time, and per-item volume
- Drag-and-drop to reorder items (pointer + keyboard accessible)
- Play / pause / next / previous controls
- Auto-advance at the configured end time; last item wraps back to the first
- Player persists across navigation between views
- Graceful empty, loading, invalid-URL, and playback-error states
- Installable PWA: works offline (app shell, fonts, thumbnails) and updates itself in the background

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS v3
- React Router v6
- `@dnd-kit` for drag-and-drop
- YouTube IFrame Player API
- `vite-plugin-pwa` (Workbox) for the manifest and service worker

## Develop

```sh
npm install
npm run dev
```

Open the URL printed by Vite (default `http://localhost:5173`).

## Build

```sh
npm run build
npm run preview
```

The service worker is disabled during `npm run dev` — use `npm run preview` to exercise
install/offline behaviour.

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The site is served from `https://<user>.github.io/yt-loop/`, so the build uses
`base: '/yt-loop/'` and the router picks that up from `import.meta.env.BASE_URL`.
If the repo is renamed, or for a custom domain / user site, set the base accordingly:

```sh
VITE_BASE=/ npm run build
```

Two details make Pages behave:

- The build writes `dist/404.html` as a copy of `index.html`. Pages has no SPA rewrite,
  so this is what makes deep links like `/yt-loop/playlists/<id>` resolve (Pages returns
  it with a 404 status on first load; once the service worker is installed, its
  navigation fallback serves the shell directly).
- `public/.nojekyll` stops Pages from running the output through Jekyll.

## PWA

- Installable on desktop and mobile; opens standalone.
- Precaches the app shell; runtime-caches Google Fonts and `i.ytimg.com` thumbnails.
- Updates apply automatically on the next visit (`registerType: 'autoUpdate'`).
- Offline you get the full UI and your saved playlists — playback itself still needs a
  connection, since video comes from YouTube.
- Icons live in `public/` (`favicon.svg`, `pwa-*.png`, `maskable-512x512.png`,
  `apple-touch-icon.png`).

## Notes

- Time inputs accept seconds (`90`) or `m:ss` (`1:30`).
- An empty end-time means "play to the natural end of the video".
- Some videos disable embedding; the player will surface an error and you can skip with the Next button.
- Titles are fetched from YouTube's public `oEmbed` endpoint (no API key). If the request fails, the video ID is used as a placeholder title and you can edit it.
