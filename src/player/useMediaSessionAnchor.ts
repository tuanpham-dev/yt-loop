import { useEffect, useRef } from 'react';

/**
 * Builds a short, all-silent PCM WAV file as a data URI.
 *
 * The actual video audio lives inside the cross-origin YouTube <iframe>, which
 * means the YouTube frame owns the OS-level Media Session. As a result the
 * `navigator.mediaSession` action handlers we register on the *parent* page
 * never receive hardware / OS media-key events (play/pause/next/prev) — most
 * visibly when the browser window is not focused.
 *
 * Playing a real (but silent) <audio> element in the top-level document makes
 * THIS document a media producer, so the browser routes the OS media controls
 * to our action handlers. The track is genuinely silent, so it never interferes
 * with the YouTube audio the user actually hears.
 */
function buildSilentWavDataUri(seconds = 1): string {
  const sampleRate = 8000; // low rate keeps the data URI tiny — silence has no detail to lose
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
  // Sample region is left as zeros == silence.

  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const SILENT_SRC = buildSilentWavDataUri();

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

  useEffect(() => {
    const audio = new Audio(SILENT_SRC);
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
    if (active) {
      // play() may reject if no user gesture has occurred yet; the first real
      // play is always triggered by the on-screen play button (a gesture), so
      // this resolves from then on.
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [active]);
}
