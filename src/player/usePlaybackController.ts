import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaylistItem } from '../types';
import type { PlayerHandle } from './YouTubePlayer';
import { useDispatch, usePlaylists, useActiveItem } from '../state/PlaylistsContext';

const POLL_MS = 250;

const YT_ERROR_MESSAGES: Record<number, string> = {
  2: 'Invalid video ID.',
  5: 'Playback error in the HTML5 player.',
  100: 'Video not found or private.',
  101: 'The video owner does not allow embedded playback.',
  150: 'The video owner does not allow embedded playback.',
};

export interface PlaybackControls {
  currentTime: number;
  duration: number;
  error: string | null;
  isReady: boolean;
  togglePlay(): void;
  next(): void;
  prev(): void;
  clearError(): void;
  playerHandlers: {
    onReady(): void;
    onStateChange(s: number): void;
    onError(code: number): void;
  };
}

export function usePlaybackController(
  playerRef: React.RefObject<PlayerHandle>,
): PlaybackControls {
  const dispatch = useDispatch();
  const state = usePlaylists();
  const activeItem = useActiveItem();

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadedVideoRef = useRef<string | null>(null);
  const loadedItemIdRef = useRef<string | null>(null);
  const activeItemRef = useRef<PlaylistItem | null>(activeItem);

  useEffect(() => {
    activeItemRef.current = activeItem;
  }, [activeItem]);

  const onReady = useCallback(() => setIsReady(true), []);
  const onError = useCallback((code: number) => {
    setError(YT_ERROR_MESSAGES[code] ?? `Playback error (code ${code}).`);
  }, []);
  const onStateChange = useCallback(
    (s: number) => {
      // 0 = ENDED — natural completion, advance.
      if (s === 0) dispatch({ type: 'NEXT' });
    },
    [dispatch],
  );

  // Load video whenever the active item changes.
  useEffect(() => {
    if (!isReady || !activeItem || !playerRef.current) return;
    const videoChanged =
      loadedItemIdRef.current !== activeItem.id ||
      loadedVideoRef.current !== activeItem.videoId;
    if (videoChanged) {
      setError(null);
      playerRef.current.setVolume(activeItem.volume);
      playerRef.current.loadVideo(activeItem.videoId, activeItem.startSec);
      loadedVideoRef.current = activeItem.videoId;
      loadedItemIdRef.current = activeItem.id;
    } else {
      playerRef.current.setVolume(activeItem.volume);
    }
  }, [activeItem, isReady, playerRef]);

  // React to play/pause toggles.
  useEffect(() => {
    if (!isReady || !activeItem || !playerRef.current) return;
    if (state.isPlaying) playerRef.current.play();
    else playerRef.current.pause();
  }, [state.isPlaying, activeItem, isReady, playerRef]);

  // Reset duration whenever the loaded video changes; the player reports the
  // real duration once metadata is parsed.
  useEffect(() => {
    setDuration(0);
  }, [activeItem?.id]);

  // Poll for end-time trigger + current-time / duration updates.
  useEffect(() => {
    if (!isReady || !playerRef.current) return;
    const interval = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      const t = player.getCurrentTime();
      setCurrentTime(t);
      const d = player.getDuration();
      if (d > 0) setDuration((prev) => (prev === d ? prev : d));
      const item = activeItemRef.current;
      if (item && state.isPlaying && item.endSec > 0 && t >= item.endSec) {
        dispatch({ type: 'NEXT' });
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [isReady, state.isPlaying, dispatch, playerRef]);

  const togglePlay = useCallback(() => {
    if (!activeItem) return;
    dispatch({ type: 'SET_PLAYING', isPlaying: !state.isPlaying });
  }, [dispatch, state.isPlaying, activeItem]);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), [dispatch]);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), [dispatch]);
  const clearError = useCallback(() => setError(null), []);

  const playerHandlers = useMemo(
    () => ({ onReady, onStateChange, onError }),
    [onReady, onStateChange, onError],
  );

  return {
    currentTime,
    duration,
    error,
    isReady,
    togglePlay,
    next,
    prev,
    clearError,
    playerHandlers,
  };
}
