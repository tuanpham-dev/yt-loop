import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaylistItem } from '../types';
import type { PlayerHandle } from './YouTubePlayer';
import { useDispatch, usePlaylists, useActiveItem } from '../state/PlaylistsContext';
import { useMediaSessionAnchor } from './useMediaSessionAnchor';

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
  // Set to the PiP playhead position when the PiP window closes, so the main
  // player resumes the (possibly advanced) video there instead of from its start.
  pipResumeRef?: React.MutableRefObject<number | null>,
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
  // The last volume we pushed to the player. Used to tell an app-driven change
  // (which matches this) apart from a change made via the player's own volume
  // control (which won't), so we can sync the latter back into app state.
  const lastVolPushRef = useRef<number | null>(null);
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
      // 0 = ENDED — natural completion. AUTO_NEXT honors the repeat mode; the
      // loadSeq bump forces a reload so 'repeat one' (and single-item loops)
      // replay even though the active index doesn't change.
      if (s === 0) {
        setLoadSeq((n) => n + 1);
        dispatch({ type: 'AUTO_NEXT' });
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
      const startAt = pipResumeRef?.current ?? activeItem.startSec;
      playerRef.current.setVolume(activeItem.volume);
      playerRef.current.loadVideo(activeItem.videoId, startAt);
      loadedVideoRef.current = activeItem.videoId;
      loadedItemIdRef.current = activeItem.id;
    } else {
      playerRef.current.setVolume(activeItem.volume);
    }
    lastVolPushRef.current = activeItem.volume;
    // The resume position applies only to this first post-PiP load.
    if (pipResumeRef) pipResumeRef.current = null;
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
        dispatch({ type: 'AUTO_NEXT' });
      }
      // Sync volume changes made via the player's own volume control back into
      // app state. lastVolPushRef matches whatever the app last pushed, so a
      // difference means the user changed it on the player itself.
      if (item && !isDocPipOpen && state.activePlaylistId && lastVolPushRef.current != null) {
        const v = Math.round(player.getVolume());
        if (v !== lastVolPushRef.current) {
          lastVolPushRef.current = v;
          dispatch({ type: 'SET_VOLUME', playlistId: state.activePlaylistId, itemId: item.id, volume: v });
        }
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [isReady, state.isPlaying, state.activePlaylistId, isDocPipOpen, dispatch, playerRef]);

  // Anchor the OS media session to this document so OS next/prev/play/pause
  // reach our handlers even when the browser is backgrounded. Disabled while a
  // Document PiP window is open — that window plays YouTube and owns its own
  // session, and main playback is paused anyway.
  useMediaSessionAnchor(state.isPlaying && !!activeItem && !isDocPipOpen);

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
