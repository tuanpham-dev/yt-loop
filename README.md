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

## Tech stack

- React 18 + TypeScript
- Vite
- Tailwind CSS v3
- React Router v6
- `@dnd-kit` for drag-and-drop
- YouTube IFrame Player API

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

## Notes

- Time inputs accept seconds (`90`) or `m:ss` (`1:30`).
- An empty end-time means "play to the natural end of the video".
- Some videos disable embedding; the player will surface an error and you can skip with the Next button.
- Titles are fetched from YouTube's public `oEmbed` endpoint (no API key). If the request fails, the video ID is used as a placeholder title and you can edit it.
