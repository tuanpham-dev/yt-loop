import { Link } from 'react-router-dom';
import { useActiveItem, useDispatch, usePlaylists } from '../state/PlaylistsContext';
import { formatTime } from '../lib/youtube';
import type { PlaybackControls } from '../player/usePlaybackController';

interface TopBarProps {
  controls: PlaybackControls;
}

export function TopBar({ controls }: TopBarProps) {
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

  const endLabel = activeItem && activeItem.endSec > 0 ? activeItem.endSec : controls.duration;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2">
        <Link
          to="/playlists"
          className="flex items-baseline gap-1 font-hand text-3xl font-bold leading-none"
        >
          YouTube <span className="sketch-underline text-accent">Loop</span>
        </Link>

        <div className="hidden min-w-0 flex-1 sm:flex sm:flex-col">
          {hasItem ? (
            <>
              <div className="truncate font-hand text-base font-bold leading-tight text-ink">
                {activeItem.title}
              </div>
              <div className="truncate text-[11px] text-ink-soft">
                {formatTime(controls.currentTime)} / {formatTime(endLabel)}{' '}
                <span className="text-ink-muted">·</span> loops{' '}
                {formatTime(activeItem.startSec)} → {formatTime(endLabel)}
              </div>
            </>
          ) : (
            <div className="truncate font-hand text-base text-ink-soft">
              Nothing playing yet — pick a video below.
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={controls.prev}
            disabled={!hasItem}
            className="rounded-full border-2 border-ink bg-paper px-2.5 py-1 font-hand text-base leading-none shadow-sketch-press hover:bg-sticky-yellow disabled:opacity-40 disabled:hover:bg-paper sm:px-3"
            aria-label="Previous"
          >
            {'<'}
          </button>
          <button
            type="button"
            onClick={controls.togglePlay}
            disabled={!hasItem}
            className="rounded-full border-2 border-ink bg-accent px-3 py-1 font-hand text-base font-bold leading-none text-paper shadow-sketch-sm transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-sketch-press active:shadow-none disabled:opacity-40 sm:px-5"
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            <span aria-hidden className="sm:hidden">{state.isPlaying ? '❚❚' : '▶'}</span>
            <span aria-hidden className="hidden sm:inline">
              {state.isPlaying ? 'Pause' : 'Play'}
            </span>
          </button>
          <button
            type="button"
            onClick={controls.next}
            disabled={!hasItem}
            className="rounded-full border-2 border-ink bg-paper px-2.5 py-1 font-hand text-base leading-none shadow-sketch-press hover:bg-sticky-yellow disabled:opacity-40 disabled:hover:bg-paper sm:px-3"
            aria-label="Next"
          >
            {'>'}
          </button>

          {hasItem ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="font-hand text-sm text-ink-soft">Vol</span>
              <input
                type="range"
                min={0}
                max={100}
                value={activeItem.volume}
                onChange={(e) => onVolume(parseInt(e.target.value, 10))}
                className="w-20 accent-accent"
                aria-label="Volume"
              />
              <span className="w-6 text-right font-hand text-sm tabular-nums text-ink-soft">
                {activeItem.volume}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
