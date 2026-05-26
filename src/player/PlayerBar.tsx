import { useActiveItem, useDispatch, usePlaylists } from '../state/PlaylistsContext';
import { formatTime } from '../lib/youtube';
import type { PlaybackControls } from './usePlaybackController';

interface PlayerBarProps {
  controls: PlaybackControls;
}

export function PlayerBar({ controls }: PlayerBarProps) {
  const state = usePlaylists();
  const dispatch = useDispatch();
  const activeItem = useActiveItem();
  const hasItem = !!activeItem;

  const onVolume = (volume: number) => {
    if (!activeItem || !state.activePlaylistId) return;
    dispatch({
      type: 'SET_VOLUME',
      playlistId: state.activePlaylistId,
      itemId: activeItem.id,
      volume,
    });
  };

  return (
    <div className="sticky bottom-0 border-t-2 border-ink bg-paper/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="truncate font-hand text-lg font-bold text-ink">
            {activeItem ? activeItem.title : 'No item selected'}
          </div>
          <div className="mt-0.5 text-xs text-ink-soft">
            {activeItem
              ? `${formatTime(controls.currentTime)} / ${formatTime(activeItem.endSec || controls.duration)} · loops ${formatTime(activeItem.startSec)} → ${formatTime(activeItem.endSec || controls.duration)}`
              : 'Pick a playlist and tap a video to start the loop'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={controls.prev}
            disabled={!hasItem}
            className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-hand text-base shadow-sketch-press hover:bg-sticky-yellow disabled:opacity-40 disabled:hover:bg-paper"
            aria-label="Previous"
          >
            ⟵
          </button>
          <button
            type="button"
            onClick={controls.togglePlay}
            disabled={!hasItem}
            className="rounded-full border-2 border-ink bg-accent px-5 py-1 font-hand text-base font-bold text-paper shadow-sketch-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-sketch-press active:shadow-none disabled:opacity-40"
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={controls.next}
            disabled={!hasItem}
            className="rounded-full border-2 border-ink bg-paper px-3 py-1 font-hand text-base shadow-sketch-press hover:bg-sticky-yellow disabled:opacity-40 disabled:hover:bg-paper"
            aria-label="Next"
          >
            ⟶
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-hand text-sm text-ink-soft">Vol</span>
          <input
            type="range"
            min={0}
            max={100}
            value={activeItem?.volume ?? 0}
            onChange={(e) => onVolume(parseInt(e.target.value, 10))}
            disabled={!hasItem}
            className="w-24 accent-accent"
            aria-label="Volume"
          />
          <span className="w-8 text-right font-hand text-sm tabular-nums text-ink-soft">
            {activeItem?.volume ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
