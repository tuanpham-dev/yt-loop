import type { Playlist, PlaylistItem } from '../types';
import { newId } from './id';

export function exportPlaylist(playlist: Playlist): void {
  const data = JSON.stringify(playlist, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `youtube-loop-export-${playlist.name.replace(/[^a-z0-9]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function isPlaylistItem(v: unknown): v is PlaylistItem {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.videoId === 'string' &&
    typeof o.title === 'string' &&
    typeof o.thumbnailUrl === 'string' &&
    typeof o.startSec === 'number' &&
    typeof o.endSec === 'number' &&
    typeof o.volume === 'number'
  );
}

export function parsePlaylistFile(file: File): Promise<Playlist> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string) as unknown;
        if (!raw || typeof raw !== 'object') throw new Error('Not a valid playlist file.');
        const o = raw as Record<string, unknown>;
        if (typeof o.name !== 'string' || !o.name.trim()) throw new Error('Missing playlist name.');
        if (!Array.isArray(o.items)) throw new Error('Missing items array.');
        if (!o.items.every(isPlaylistItem)) throw new Error('One or more items are invalid.');
        const playlist: Playlist = {
          id: newId(),
          name: o.name.trim(),
          activeItemIndex: 0,
          items: o.items.map((item) => ({ ...item, id: newId() })),
        };
        resolve(playlist);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.readAsText(file);
  });
}
