import type { Action, AppState, Playlist } from '../types';
import { initialState } from '../lib/storage';

function clampIndex(playlist: Playlist, index: number): number {
  if (playlist.items.length === 0) return 0;
  return Math.max(0, Math.min(index, playlist.items.length - 1));
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
        return { ...p, activeItemIndex: (p.activeItemIndex + 1) % p.items.length };
      });
    }

    case 'PREV': {
      if (!state.activePlaylistId) return state;
      return updatePlaylist(state, state.activePlaylistId, (p) => {
        if (p.items.length === 0) return p;
        return {
          ...p,
          activeItemIndex: (p.activeItemIndex - 1 + p.items.length) % p.items.length,
        };
      });
    }

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.isPlaying };

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
