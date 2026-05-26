export interface PlaylistItem {
  id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  startSec: number;
  endSec: number;
  volume: number;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  activeItemIndex: number;
}

export interface AppState {
  version: number;
  playlists: Playlist[];
  activePlaylistId: string | null;
  isPlaying: boolean;
}

export type Action =
  | { type: 'CREATE_PLAYLIST'; name: string }
  | { type: 'RENAME_PLAYLIST'; playlistId: string; name: string }
  | { type: 'DELETE_PLAYLIST'; playlistId: string }
  | { type: 'SELECT_PLAYLIST'; playlistId: string | null }
  | { type: 'ADD_ITEM'; playlistId: string; item: PlaylistItem }
  | { type: 'UPDATE_ITEM'; playlistId: string; itemId: string; patch: Partial<Omit<PlaylistItem, 'id'>> }
  | { type: 'REMOVE_ITEM'; playlistId: string; itemId: string }
  | { type: 'REORDER_ITEM'; playlistId: string; fromIndex: number; toIndex: number }
  | { type: 'SELECT_ITEM'; playlistId: string; index: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_VOLUME'; playlistId: string; itemId: string; volume: number };
