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
  // Item ids in randomized playback order, used only while shuffle is on. The
  // `items` array always stays in its original order; this is a separate view.
  shuffleOrder?: string[];
}

// 'all'  — loop the whole playlist (wraps at the end).
// 'one'  — repeat the current video.
export type RepeatMode = 'all' | 'one';

export interface AppState {
  version: number;
  playlists: Playlist[];
  activePlaylistId: string | null;
  isPlaying: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
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
  | { type: 'SET_SHUFFLE'; shuffle: boolean }
  | { type: 'SET_REPEAT'; repeat: RepeatMode }
  // Natural end of a video (not a manual skip): advances per the repeat mode.
  | { type: 'AUTO_NEXT' }
  | { type: 'SET_VOLUME'; playlistId: string; itemId: string; volume: number }
  | { type: 'IMPORT_PLAYLIST'; playlist: Playlist };
