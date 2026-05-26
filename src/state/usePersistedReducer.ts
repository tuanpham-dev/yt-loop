import { useEffect, useReducer, useRef } from 'react';
import type { Action, AppState } from '../types';
import { loadState, saveState } from '../lib/storage';
import { reducer } from './playlistsReducer';

export function usePersistedReducer(): [AppState, React.Dispatch<Action>] {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  return [state, dispatch];
}
