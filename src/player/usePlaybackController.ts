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
  isDocPipOpen: boolean,
): PlaybackControls {
  const dispatch = useDispatch();
  const state = usePlaylists();
  const activeItem = useActiveItem();

  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // loadSeq increments on every natural video end or explicit prev/next to force
  // a reload even when the active item id doesn't change (single-item playlists).
  const [loadSeq, setLoadSeq] = useState(0);
  const loadedSeqRef = useRef(0);

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
      if (s === 0) {
        setLoadSeq((n) => n + 1);
        dispatch({ type: 'NEXT' });
      }
    },
    [dispatch],
  );

  // Load video whenever the active item changes or a force-reload is requested.
  useEffect(() => {
    if (isDocPipOpen) return;
    if (!isReady || !activeItem || !playerRef.current) return;
    const videoChanged =
      loadedItemIdRef.current !== activeItem.id ||
      loadedVideoRef.current !== activeItem.videoId;
    const seqChanged = loadSeq !== loadedSeqRef.current;
    if (videoChanged || seqChanged) {
      loadedSeqRef.current = loadSeq;
      setError(null);
      playerRef.current.setVolume(activeItem.volume);
      playerRef.current.loadVideo(activeItem.videoId, activeItem.startSec);
      loadedVideoRef.current = activeItem.videoId;
      loadedItemIdRef.current = activeItem.id;
    } else {
      playerRef.current.setVolume(activeItem.volume);
    }
  }, [activeItem, isReady, playerRef, isDocPipOpen, loadSeq]);

  // React to play/pause toggles.
  useEffect(() => {
    if (isDocPipOpen) return;
    if (!isReady || !activeItem || !playerRef.current) return;
    if (state.isPlaying) playerRef.current.play();
    else playerRef.current.pause();
  }, [state.isPlaying, activeItem, isReady, playerRef, isDocPipOpen]);

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
        setLoadSeq((n) => n + 1);
        dispatch({ type: 'NEXT' });
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [isReady, state.isPlaying, dispatch, playerRef]);

  // Media Session API — exposes OS-level media controls (lock screen, notification bar, etc.)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    if (!activeItem) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeItem.title,
      artwork: activeItem.thumbnailUrl
        ? [{ src: activeItem.thumbnailUrl, sizes: '480x360', type: 'image/jpeg' }]
        : [],
    });
  }, [activeItem]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !activeItem) return;
    navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
  }, [state.isPlaying, activeItem]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () =>
      dispatch({ type: 'SET_PLAYING', isPlaying: true }),
    );
    navigator.mediaSession.setActionHandler('pause', () =>
      dispatch({ type: 'SET_PLAYING', isPlaying: false }),
    );
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      setLoadSeq((n) => n + 1);
      dispatch({ type: 'NEXT' });
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      setLoadSeq((n) => n + 1);
      dispatch({ type: 'PREV' });
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime != null) playerRef.current?.seekTo(details.seekTime);
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skip = details.seekOffset ?? 10;
      playerRef.current?.seekTo((playerRef.current.getCurrentTime() ?? 0) + skip);
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skip = details.seekOffset ?? 10;
      playerRef.current?.seekTo(Math.max(0, (playerRef.current.getCurrentTime() ?? 0) - skip));
    });
    return () => {
      (['play', 'pause', 'nexttrack', 'previoustrack', 'seekto', 'seekforward', 'seekbackward'] as const).forEach(
        (action) => navigator.mediaSession.setActionHandler(action, null),
      );
    };
  }, [dispatch, playerRef]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration),
      });
    } catch {
      /* ignore — setPositionState throws if values are out of range */
    }
  }, [currentTime, duration]);

  const togglePlay = useCallback(() => {
    if (!activeItem) return;
    dispatch({ type: 'SET_PLAYING', isPlaying: !state.isPlaying });
  }, [dispatch, state.isPlaying, activeItem]);

  const next = useCallback(() => {
    setLoadSeq((n) => n + 1);
    dispatch({ type: 'NEXT' });
  }, [dispatch]);
  const prev = useCallback(() => {
    setLoadSeq((n) => n + 1);
    dispatch({ type: 'PREV' });
  }, [dispatch]);
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
