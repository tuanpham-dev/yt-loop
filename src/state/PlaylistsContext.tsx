import { createContext, useContext, useMemo } from 'react';
import type { Action, AppState, Playlist, PlaylistItem } from '../types';
import { usePersistedReducer } from './usePersistedReducer';

interface ContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const PlaylistsContext = createContext<ContextValue | null>(null);

export function PlaylistsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = usePersistedReducer();
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

function useCtx(): ContextValue {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error('usePlaylists must be used inside PlaylistsProvider');
  return ctx;
}

export function usePlaylists(): AppState {
  return useCtx().state;
}

export function useDispatch(): React.Dispatch<Action> {
  return useCtx().dispatch;
}

export function useActivePlaylist(): Playlist | null {
  const { state } = useCtx();
  if (!state.activePlaylistId) return null;
  return state.playlists.find((p) => p.id === state.activePlaylistId) ?? null;
}

export function useActiveItem(): PlaylistItem | null {
  const active = useActivePlaylist();
  if (!active || active.items.length === 0) return null;
  return active.items[active.activeItemIndex] ?? null;
}
