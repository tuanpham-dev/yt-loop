import type { AppState } from '../types';

const KEY = 'youtube-loop:state';
export const STATE_VERSION = 1;

export const initialState: AppState = {
  version: STATE_VERSION,
  playlists: [],
  activePlaylistId: null,
  isPlaying: false,
  shuffle: false,
  repeat: 'all',
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== STATE_VERSION) return initialState;
    return {
      ...initialState,
      ...parsed,
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota / private mode — silently ignore
  }
}
