const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (ID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0];
      return ID_RE.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = url.searchParams.get('v');
      if (v && ID_RE.test(v)) return v;

      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'v') {
        const id = parts[1];
        if (id && ID_RE.test(id)) return id;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
}

export async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as OEmbedResponse;
    return data.title ?? null;
  } catch {
    return null;
  }
}

export function formatTime(totalSec: number): string {
  if (!Number.isFinite(totalSec) || totalSec < 0) return '0:00';
  const s = Math.floor(totalSec);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, '0')}`;
}

export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return parseFloat(trimmed);
  const m = trimmed.match(/^(\d+):([0-5]?\d)(?:\.(\d+))?$/);
  if (m) {
    const mins = parseInt(m[1], 10);
    const secs = parseInt(m[2], 10);
    const frac = m[3] ? parseFloat(`0.${m[3]}`) : 0;
    return mins * 60 + secs + frac;
  }
  return null;
}
