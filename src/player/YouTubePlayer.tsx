import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { loadYouTubeApi, type YTPlayer } from './loadYouTubeApi';

export interface PlayerHandle {
  play(): void;
  pause(): void;
  seekTo(sec: number): void;
  setVolume(v: number): void;
  getVolume(): number;
  loadVideo(videoId: string, startSec: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  isReady(): boolean;
}

export interface YouTubePlayerProps {
  onReady?(): void;
  onStateChange?(state: number): void;
  onError?(code: number): void;
}

export const YouTubePlayer = forwardRef<PlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer({ onReady, onStateChange, onError }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const readyRef = useRef(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Always-fresh callbacks
    const onReadyRef = useRef(onReady);
    const onStateChangeRef = useRef(onStateChange);
    const onErrorRef = useRef(onError);
    useEffect(() => {
      onReadyRef.current = onReady;
      onStateChangeRef.current = onStateChange;
      onErrorRef.current = onError;
    }, [onReady, onStateChange, onError]);

    useEffect(() => {
      let cancelled = false;
      loadYouTubeApi()
        .then((YTApi) => {
          if (cancelled || !containerRef.current) return;
          playerRef.current = new YTApi.Player(containerRef.current, {
            height: '100%',
            width: '100%',
            playerVars: {
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
            },
            events: {
              onReady: () => {
                readyRef.current = true;
                onReadyRef.current?.();
              },
              onStateChange: (e) => onStateChangeRef.current?.(e.data),
              onError: (e) => onErrorRef.current?.(e.data),
            },
          });
        })
        .catch(() => setLoadError('Could not load the YouTube player.'));
      return () => {
        cancelled = true;
        try {
          playerRef.current?.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
        readyRef.current = false;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.playVideo(),
      pause: () => playerRef.current?.pauseVideo(),
      seekTo: (sec) => playerRef.current?.seekTo(sec, true),
      setVolume: (v) => playerRef.current?.setVolume(v),
      getVolume: () => playerRef.current?.getVolume() ?? 100,
      loadVideo: (videoId, startSec) =>
        playerRef.current?.loadVideoById({ videoId, startSeconds: startSec }),
      getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
      getDuration: () => playerRef.current?.getDuration() ?? 0,
      isReady: () => readyRef.current,
    }));

    return (
      <div className="relative aspect-video w-full bg-ink [&>iframe]:absolute [&>iframe]:inset-0">
        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-paper-50 font-hand text-xl text-accent">
            {loadError}
          </div>
        ) : (
          <div ref={containerRef} className="absolute inset-0" />
        )}
      </div>
    );
  },
);
