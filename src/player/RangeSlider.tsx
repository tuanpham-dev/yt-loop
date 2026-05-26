import { formatTime } from '../lib/youtube';

const MIN_GAP_SEC = 0.5;

interface RangeSliderProps {
  startSec: number;
  endSec: number;
  duration: number;
  currentTime: number;
  onChangeStart(sec: number): void;
  onChangeEnd(sec: number): void;
  onCommitStart?(sec: number): void;
}

function clampPct(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(100, p));
}

export function RangeSlider({
  startSec,
  endSec,
  duration,
  currentTime,
  onChangeStart,
  onChangeEnd,
  onCommitStart,
}: RangeSliderProps) {
  const disabled = duration <= 0;
  const max = duration > 0 ? duration : 1;
  const effectiveEnd = endSec > 0 ? Math.min(endSec, max) : max;
  const clampedStart = Math.max(0, Math.min(startSec, max));

  const startPct = clampPct((clampedStart / max) * 100);
  const endPct = clampPct((effectiveEnd / max) * 100);
  const playheadPct = clampPct((currentTime / max) * 100);

  const handleStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    const next = Math.max(0, Math.min(v, effectiveEnd - MIN_GAP_SEC));
    onChangeStart(Number(next.toFixed(2)));
  };

  const handleEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!Number.isFinite(v)) return;
    const next = Math.min(max, Math.max(v, clampedStart + MIN_GAP_SEC));
    onChangeEnd(Number(next.toFixed(2)));
  };

  const commitStart = (e: React.SyntheticEvent<HTMLInputElement>) => {
    if (!onCommitStart) return;
    const v = parseFloat((e.target as HTMLInputElement).value);
    if (Number.isFinite(v)) onCommitStart(v);
  };

  return (
    <div
      className="select-none rounded-sketch-sm border-[3px] border-ink bg-paper-50 px-4 py-3 shadow-sketch-sm"
      aria-disabled={disabled}
    >
      <div className="mb-2 flex items-center justify-between font-hand text-sm tabular-nums text-ink">
        <span title="Start" className="rounded border-2 border-ink bg-sticky-yellow px-1.5">
          {formatTime(clampedStart)}
        </span>
        <span className="text-ink-soft">
          {formatTime(currentTime)}{' '}
          <span className="text-ink-muted">/</span> {formatTime(duration)}
        </span>
        <span title="End" className="rounded border-2 border-ink bg-sticky-pink px-1.5">
          {formatTime(effectiveEnd)}
        </span>
      </div>

      <div className="relative h-9">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 border-y-2 border-ink bg-accent/60"
          style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-6 w-[2px] -translate-y-1/2 bg-ink"
          style={{ left: `${playheadPct}%` }}
          aria-hidden
        />

        <input
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={clampedStart}
          onChange={handleStart}
          onMouseUp={commitStart}
          onTouchEnd={commitStart}
          onKeyUp={commitStart}
          disabled={disabled}
          aria-label="Start time"
          className="range-thumb absolute inset-0 m-0 w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={0}
          max={max}
          step={0.1}
          value={effectiveEnd}
          onChange={handleEnd}
          disabled={disabled}
          aria-label="End time"
          className="range-thumb absolute inset-0 m-0 w-full appearance-none bg-transparent"
        />
      </div>

      {disabled ? (
        <div className="mt-2 font-hand text-sm text-ink-soft">Waiting for video duration…</div>
      ) : null}
    </div>
  );
}
