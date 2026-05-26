---
name: create-app
description: Create a YouTube video loop app
---

Create a YouTube loop app that lets users build playlists of YouTube videos and replay selected segments continuously. The interface should be simple, responsive, and easy to use without requiring an account.

Requirements:
- Users can create, rename, delete, and select playlists.
- Users can add YouTube videos to a playlist by URL or video ID.
- Each playlist item supports a thumbnail image, title, start time, end time, and volume setting.
- Users can edit or remove videos from a playlist.
- Users can play, pause, skip to the next video, and go back to the previous video.
- Users can reorder videos within a playlist via drag-and-drop.
- The active video player persists while users navigate between app views.
- When a video reaches its configured end time, playback automatically advances to the next playlist item.
- When the last playlist item ends, playback continues from the first item.
- Playlists, video metadata, timing, volume, and the active selection are saved in `localStorage` and restored on reload.
- Empty, loading, invalid URL, and playback error states are handled gracefully.

Tech stack:
- React
- TypeScript
- Tailwind CSS
- `localStorage` for persistence
