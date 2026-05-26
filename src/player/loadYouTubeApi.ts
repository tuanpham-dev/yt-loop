// Minimal types for the YouTube IFrame Player API we use.
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  loadVideoById(arg: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
  cueVideoById(arg: { videoId: string; startSeconds?: number; endSeconds?: number }): void;
  destroy(): void;
}

export interface YTPlayerOptions {
  height?: string | number;
  width?: string | number;
  videoId?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number; target: YTPlayer }) => void;
    onError?: (event: { data: number; target: YTPlayer }) => void;
  };
}

interface YTApi {
  Player: new (el: HTMLElement | string, opts: YTPlayerOptions) => YTPlayer;
  PlayerState: {
    UNSTARTED: -1;
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
}

declare global {
  interface Window {
    YT?: YTApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let promise: Promise<YTApi> | null = null;

export function loadYouTubeApi(): Promise<YTApi> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API requires a browser'));
  }
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (promise) return promise;

  promise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });
  return promise;
}
