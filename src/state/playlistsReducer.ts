import type { Action, AppState, Playlist, PlaylistItem } from '../types';
import { initialState } from '../lib/storage';

function clampIndex(playlist: Playlist, index: number): number {
  if (playlist.items.length === 0) return 0;
  return Math.max(0, Math.min(index, playlist.items.length - 1));
}

// Fisher-Yates shuffle of the item ids. When `firstId` is given it is moved to
// the front so shuffled playback continues from the currently-playing item.
function shuffledIds(items: PlaylistItem[], firstId?: string): string[] {
  const ids = items.map((i) => i.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  if (firstId) {
    const idx = ids.indexOf(firstId);
    if (idx > 0) {
      ids.splice(idx, 1);
      ids.unshift(firstId);
    }
  }
  return ids;
}

// True when `order` is a permutation of the current item ids (i.e. not stale
// after items were added or removed).
function isValidOrder(order: string[] | undefined, items: PlaylistItem[]): boolean {
  if (!order || order.length !== items.length) return false;
  const set = new Set(order);
  if (set.size !== items.length) return false;
  return items.every((it) => set.has(it.id));
}

// Advance/rewind through the shuffled order, rebuilding it if it has gone stale.
// Keeps `items` untouched and only moves `activeItemIndex` (which points into
// the original order) to the next shuffled item.
function shuffleStep(p: Playlist, dir: 1 | -1): Playlist {
  const currentId = p.items[p.activeItemIndex]?.id;
  const order = isValidOrder(p.shuffleOrder, p.items)
    ? p.shuffleOrder!
    : shuffledIds(p.items, currentId);
  const pos = currentId ? order.indexOf(currentId) : 0;
  const nextId = order[(pos + dir + order.length) % order.length];
  const nextIndex = p.items.findIndex((it) => it.id === nextId);
  return {
    ...p,
    shuffleOrder: order,
    activeItemIndex: nextIndex >= 0 ? nextIndex : p.activeItemIndex,
  };
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function reorderActiveIndex(active: number, from: number, to: number): number {
  if (from === to) return active;
  if (active === from) return to;
  if (from < active && to >= active) return active - 1;
  if (from > active && to <= active) return active + 1;
  return active;
}

function updatePlaylist(
  state: AppState,
  playlistId: string,
  fn: (p: Playlist) => Playlist,
): AppState {
  return {
    ...state,
    playlists: state.playlists.map((p) => (p.id === playlistId ? fn(p) : p)),
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'CREATE_PLAYLIST': {
      const id = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const playlist: Playlist = {
        id,
        name: action.name.trim() || 'Untitled playlist',
        items: [],
        activeItemIndex: 0,
      };
      return {
        ...state,
        playlists: [...state.playlists, playlist],
        activePlaylistId: state.activePlaylistId ?? id,
      };
    }

    case 'RENAME_PLAYLIST':
      return updatePlaylist(state, action.playlistId, (p) => ({
        ...p,
        name: action.name.trim() || p.name,
      }));

    case 'DELETE_PLAYLIST': {
      const playlists = state.playlists.filter((p) => p.id !== action.playlistId);
      const activePlaylistId =
        state.activePlaylistId === action.playlistId
          ? playlists[0]?.id ?? null
          : state.activePlaylistId;
      return {
        ...state,
        playlists,
        activePlaylistId,
        isPlaying: state.activePlaylistId === action.playlistId ? false : state.isPlaying,
      };
    }

    case 'SELECT_PLAYLIST':
      return { ...state, activePlaylistId: action.playlistId };

    case 'ADD_ITEM':
      return updatePlaylist(state, action.playlistId, (p) => ({
        ...p,
        items: [...p.items, action.item],
      }));

    case 'UPDATE_ITEM':
      return updatePlaylist(state, action.playlistId, (p) => ({
        ...p,
        items: p.items.map((it) =>
          it.id === action.itemId ? { ...it, ...action.patch } : it,
        ),
      }));

    case 'REMOVE_ITEM': {
      return updatePlaylist(state, action.playlistId, (p) => {
        const idx = p.items.findIndex((it) => it.id === action.itemId);
        if (idx < 0) return p;
        const items = p.items.filter((it) => it.id !== action.itemId);
        let activeItemIndex = p.activeItemIndex;
        if (idx < activeItemIndex) activeItemIndex -= 1;
        if (items.length === 0) activeItemIndex = 0;
        else if (activeItemIndex >= items.length) activeItemIndex = 0;
        return { ...p, items, activeItemIndex };
      });
    }

    case 'REORDER_ITEM':
      return updatePlaylist(state, action.playlistId, (p) => {
        if (
          action.fromIndex < 0 ||
          action.toIndex < 0 ||
          action.fromIndex >= p.items.length ||
          action.toIndex >= p.items.length ||
          action.fromIndex === action.toIndex
        ) {
          return p;
        }
        return {
          ...p,
          items: arrayMove(p.items, action.fromIndex, action.toIndex),
          activeItemIndex: reorderActiveIndex(
            p.activeItemIndex,
            action.fromIndex,
            action.toIndex,
          ),
        };
      });

    case 'SELECT_ITEM':
      return {
        ...updatePlaylist(state, action.playlistId, (p) => ({
          ...p,
          activeItemIndex: clampIndex(p, action.index),
        })),
        activePlaylistId: action.playlistId,
        isPlaying: true,
      };

    case 'NEXT': {
      if (!state.activePlaylistId) return state;
      return updatePlaylist(state, state.activePlaylistId, (p) => {
        if (p.items.length === 0) return p;
        if (state.shuffle) return shuffleStep(p, 1);
        return { ...p, activeItemIndex: (p.activeItemIndex + 1) % p.items.length };
      });
    }

    case 'PREV': {
      if (!state.activePlaylistId) return state;
      return updatePlaylist(state, state.activePlaylistId, (p) => {
        if (p.items.length === 0) return p;
        if (state.shuffle) return shuffleStep(p, -1);
        return {
          ...p,
          activeItemIndex: (p.activeItemIndex - 1 + p.items.length) % p.items.length,
        };
      });
    }

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };

    case 'SET_SHUFFLE': {
      if (!action.shuffle) return { ...state, shuffle: false };
      // Build a fresh order for the active playlist, anchored at the current
      // item so playback continues from where it is rather than jumping.
      const next = { ...state, shuffle: true };
      if (!state.activePlaylistId) return next;
      return updatePlaylist(next, state.activePlaylistId, (p) => ({
        ...p,
        shuffleOrder: shuffledIds(p.items, p.items[p.activeItemIndex]?.id),
      }));
    }

    case 'SET_REPEAT':
      return { ...state, repeat: action.repeat };

    case 'AUTO_NEXT': {
      if (!state.activePlaylistId) return state;
      // 'one' replays the same video; the controller forces the reload, so the
      // active index stays put here.
      if (state.repeat === 'one') return state;
      return updatePlaylist(state, state.activePlaylistId, (p) => {
        if (p.items.length === 0) return p;
        return state.shuffle
          ? shuffleStep(p, 1)
          : { ...p, activeItemIndex: (p.activeItemIndex + 1) % p.items.length };
      });
    }

    case 'SET_VOLUME':
      return updatePlaylist(state, action.playlistId, (p) => ({
        ...p,
        items: p.items.map((it) =>
          it.id === action.itemId ? { ...it, volume: action.volume } : it,
        ),
      }));

    case 'IMPORT_PLAYLIST':
      return {
        ...state,
        playlists: [...state.playlists, action.playlist],
        activePlaylistId: state.activePlaylistId ?? action.playlist.id,
      };

    default:
      return state;
  }
}

export { initialState };
