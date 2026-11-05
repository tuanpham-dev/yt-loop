import { useEffect, useRef } from 'react';

/**
 * Builds a short, all-silent PCM WAV file and returns it as a Blob URL.
 *
 * The actual video audio lives inside the cross-origin YouTube <iframe>, which
 * means the YouTube frame owns the OS-level Media Session. As a result the
 * `navigator.mediaSession` action handlers we register on the *parent* page
 * never receive hardware / OS media-key events (play/pause/next/prev) — most
 * visibly when the browser window is not focused.
 *
 * Playing a real (but silent) <audio> element in the top-level document makes
 * THIS document a media producer, so Chromium routes the OS media controls to
 * our action handlers (it prefers the top-most frame that has a player). The
 * track is genuinely silent, so it never interferes with the YouTube audio.
 *
 * WebKit (Safari, WKWebView) does NOT honour this: it gives Now Playing to the
 * largest visible <video>, i.e. the one inside the YouTube iframe, so OS
 * next/prev can't reach this page there.
 *
 * The clip is 10 s long: Chromium classifies media of 5 s or less as a
 * "transient" sound, and WebKit ignores audio under ~1 s for Now Playing.
 */
export function buildSilentWavUrl(seconds = 10): string {
  const sampleRate = 8000; // low rate keeps the file small — silence has no detail to lose
  const numSamples = sampleRate * seconds;
  const bytesPerSample = 2; // 16-bit
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  // Sample region is left as zeros == silence (16-bit PCM is signed).

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
}

let silentUrl: string | null = null;
/** Lazily built and shared for the page's lifetime (also used by the PiP window). */
export function getSilentUrl(): string {
  if (!silentUrl) silentUrl = buildSilentWavUrl();
  return silentUrl;
}

/**
 * Keeps a silent looping <audio> element playing in the top-level document so
 * the OS media controls (incl. when the browser is in the background) are
 * routed to the parent page's `navigator.mediaSession` action handlers rather
 * than to the cross-origin YouTube iframe.
 *
 * @param active whether playback is currently active (mirror of `isPlaying`).
 */
export function useMediaSessionAnchor(active: boolean): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const audio = new Audio(getSilentUrl());
    audio.loop = true;
    audio.preload = 'auto';
    // A non-zero volume is required for some browsers to treat it as a real
    // media producer and grant audio focus; the samples themselves are silent.
    audio.volume = 1;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!active) {
      audio.pause();
      return;
    }
    // play() rejects without a user gesture — e.g. after a reload restored
    // isPlaying, or when playback was started by clicking inside the YouTube
    // iframe. Retry on the next click / key press in this document.
    let retry: (() => void) | null = null;
    audio.play().catch(() => {
      retry = () => {
        if (activeRef.current && audio.paused) void audio.play().catch(() => {});
      };
      document.addEventListener('pointerdown', retry, { once: true, capture: true });
      document.addEventListener('keydown', retry, { once: true, capture: true });
    });
    return () => {
      if (retry) {
        document.removeEventListener('pointerdown', retry, { capture: true });
        document.removeEventListener('keydown', retry, { capture: true });
      }
    };
  }, [active]);
}
